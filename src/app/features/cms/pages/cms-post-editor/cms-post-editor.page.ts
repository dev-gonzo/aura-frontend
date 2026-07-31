import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { ImageUploadComponent } from '../../../../shared/components/forms/image-upload/image-upload.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea/form-textarea.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { ModalComponent } from '../../../../shared/components/feedback/modal/modal.component';
import { CmsContentEditorComponent } from '../../components/cms-content-editor/cms-content-editor.component';
import { CmsImagesService } from '../../services/cms-images.service';
import { CmsPostDetail, CmsPostsService } from '../../services/cms-posts.service';
import { getCmsDraftStatusClass, getCmsDraftStatusLabel, getCmsTypeLabel } from '../../utils/cms-post-status';
import { processCmsCardImage } from '../../utils/process-cms-card-image';
import { processCmsCoverDesktopImage, processCmsCoverMobileImage } from '../../utils/process-cms-cover-image';

@Component({
  selector: 'app-cms-post-editor-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    ButtonComponent,
    ImageUploadComponent,
    FormInputComponent,
    FormTextareaComponent,
    CmsContentEditorComponent,
    ModalComponent,
  ],
  templateUrl: './cms-post-editor.page.html',
  styleUrl: './cms-post-editor.page.css',
})
export class CmsPostEditorPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cmsPostsService = inject(CmsPostsService);
  private readonly cmsImagesService = inject(CmsImagesService);
  private readonly formBuilder = inject(FormBuilder);

  @ViewChild(CmsContentEditorComponent) private readonly contentEditor?: CmsContentEditorComponent;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly submitted = signal(false);
  protected readonly post = signal<CmsPostDetail | null>(null);
  protected readonly hasUnsavedChanges = signal(false);

  protected readonly confirmModalOpen = signal(false);
  protected readonly confirmModalTitle = signal('');
  protected readonly confirmModalText = signal('');
  protected readonly confirmAction = signal<null | (() => Promise<void>)>(null);

  protected readonly rejectModalOpen = signal(false);
  protected readonly rejectNotes = signal('');

  protected readonly coverDesktopProcessing = signal(false);
  protected readonly coverMobileProcessing = signal(false);
  protected readonly coverDesktopPreviewUrl = signal<string | null>(null);
  protected readonly coverMobilePreviewUrl = signal<string | null>(null);
  protected readonly coverErrorMessage = signal('');
  protected readonly cardImageProcessing = signal(false);
  protected readonly cardImagePreviewUrl = signal<string | null>(null);

  protected readonly tipo = computed(() => String(this.route.snapshot.data['tipo'] ?? 'BLOG'));
  protected readonly tipoLabel = computed(() => getCmsTypeLabel(this.tipo()));
  protected readonly id = computed(() => String(this.route.snapshot.paramMap.get('id') ?? ''));
  protected readonly isNew = computed(() => !this.id());
  protected readonly pageTitle = computed(() => (this.isNew() ? `Novo ${this.tipoLabel()}` : `Editar ${this.tipoLabel()}`));

  protected readonly draftStatusLabel = computed(() => getCmsDraftStatusLabel(this.post()?.draft_status ?? ''));
  protected readonly draftStatusClass = computed(() => getCmsDraftStatusClass(this.post()?.draft_status ?? ''));
  protected readonly isPublished = computed(() => !!this.post()?.published_at);
  protected readonly isArchived = computed(() => !!this.post()?.archived_at);
  protected readonly currentStage = computed(() => {
    if (this.isArchived()) {
      return 'ARQUIVADO';
    }
    if (this.isPublished()) {
      return 'PUBLICADO';
    }
    return (this.post()?.draft_status ?? 'RASCUNHO').toUpperCase();
  });
  protected readonly workflowBlocked = computed(
    () => this.loading() || this.saving() || this.hasUnsavedChanges() || this.isArchived() || this.isNew()
  );
  protected readonly shouldShowSubmitForReview = computed(() => {
    const stage = this.currentStage();
    return stage === 'RASCUNHO' || stage === 'REPROVADO';
  });
  protected readonly shouldShowApproveReject = computed(() => this.currentStage() === 'EM_REVISAO');
  protected readonly shouldShowPublish = computed(() => this.currentStage() === 'APROVADO' && !this.isPublished());
  protected readonly shouldShowUnpublish = computed(() => this.isPublished() && !this.isArchived());
  protected readonly workflowHint = computed(() => {
    if (this.isArchived()) {
      return 'Conteúdos arquivados ficam fora do fluxo de publicação.';
    }
    if (this.isNew()) {
      return 'Salve o rascunho para iniciar o fluxo de publicação.';
    }
    if (this.hasUnsavedChanges()) {
      return 'Salve o rascunho para continuar o fluxo.';
    }
    return '';
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    draft_titulo: ['', [Validators.required, Validators.maxLength(255)]],
    draft_slug: ['', [Validators.maxLength(255)]],
    draft_card_image_id: [''],
    draft_resumo: ['', [Validators.maxLength(140)]],
    draft_conteudo_html: [''],
    draft_capa_image_id: [''],
    draft_capa_mobile_image_id: [''],
    draft_seo_title: [''],
    draft_seo_description: [''],
    draft_seo_tags: [''],
  });

  constructor() {
    if (!this.isNew()) {
      void this.load();
    } else {
      this.coverDesktopPreviewUrl.set(null);
      this.coverMobilePreviewUrl.set(null);
      this.coverErrorMessage.set('');
      this.form.reset({
        draft_titulo: '',
        draft_slug: '',
        draft_card_image_id: '',
        draft_resumo: '',
        draft_conteudo_html: '',
        draft_capa_image_id: '',
        draft_capa_mobile_image_id: '',
        draft_seo_title: '',
        draft_seo_description: '',
        draft_seo_tags: '',
      });
      this.form.controls.draft_slug.disable({ emitEvent: false });
      this.form.markAsPristine();
      this.hasUnsavedChanges.set(false);
    }
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.hasUnsavedChanges.set(this.form.dirty);
    });
    this.form.controls.draft_slug.disable({ emitEvent: false });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const post = await this.cmsPostsService.get(this.id());
      this.post.set(post);
      this.form.reset({
        draft_titulo: post.draft_titulo || '',
        draft_slug: post.draft_slug || '',
        draft_card_image_id: post.draft_card_image_id || '',
        draft_resumo: post.draft_resumo || '',
        draft_conteudo_html: post.draft_conteudo_html || '',
        draft_capa_image_id: post.draft_capa_image_id || '',
        draft_capa_mobile_image_id: post.draft_capa_mobile_image_id || '',
        draft_seo_title: post.draft_seo_title || '',
        draft_seo_description: post.draft_seo_description || '',
        draft_seo_tags: post.draft_seo_tags || '',
      });
      this.cardImagePreviewUrl.set(
        post.draft_card_image_id ? this.cmsImagesService.rawUrl(post.draft_card_image_id) : null
      );
      this.coverDesktopPreviewUrl.set(
        post.draft_capa_image_id ? this.cmsImagesService.rawUrl(post.draft_capa_image_id) : null
      );
      this.coverMobilePreviewUrl.set(
        post.draft_capa_mobile_image_id ? this.cmsImagesService.rawUrl(post.draft_capa_mobile_image_id) : null
      );
      this.coverErrorMessage.set('');
      this.form.controls.draft_slug.disable({ emitEvent: false });
      this.form.markAsPristine();
      this.hasUnsavedChanges.set(false);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
      this.post.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  protected hasFieldError(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return this.submitted() && control.invalid;
  }

  protected getFieldError(field: keyof typeof this.form.controls): string {
    if (!this.hasFieldError(field)) {
      return '';
    }
    const control = this.form.controls[field];
    if (control.errors?.['required']) {
      switch (field) {
        case 'draft_titulo':
          return 'Informe o título.';
        default:
          return 'Campo obrigatório.';
      }
    }
    if (control.errors?.['maxlength']) {
      switch (field) {
        case 'draft_resumo':
          return 'Use no máximo 140 caracteres.';
        default:
          return 'Texto muito longo.';
      }
    }
    return 'Revise o conteúdo deste campo.';
  }

  protected async handleCoverDesktopSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.coverDesktopProcessing.set(true);
    this.coverErrorMessage.set('');

    try {
      const processed = await processCmsCoverDesktopImage(file);
      const response = await this.cmsImagesService.create(processed.payload);
      this.form.controls.draft_capa_image_id.setValue(response.id);
      this.coverDesktopPreviewUrl.set(this.cmsImagesService.rawUrl(response.id));
      this.form.markAsDirty();
    } catch (error) {
      this.coverErrorMessage.set(processApiError(error));
    } finally {
      this.coverDesktopProcessing.set(false);
      input.value = '';
    }
  }

  protected async handleCardImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.cardImageProcessing.set(true);
    this.coverErrorMessage.set('');

    try {
      const processed = await processCmsCardImage(file);
      const response = await this.cmsImagesService.create(processed.payload);
      this.form.controls.draft_card_image_id.setValue(response.id);
      this.cardImagePreviewUrl.set(this.cmsImagesService.rawUrl(response.id));
      this.form.markAsDirty();
    } catch (error) {
      this.coverErrorMessage.set(processApiError(error));
    } finally {
      this.cardImageProcessing.set(false);
      input.value = '';
    }
  }

  protected async handleCoverMobileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.coverMobileProcessing.set(true);
    this.coverErrorMessage.set('');

    try {
      const processed = await processCmsCoverMobileImage(file);
      const response = await this.cmsImagesService.create(processed.payload);
      this.form.controls.draft_capa_mobile_image_id.setValue(response.id);
      this.coverMobilePreviewUrl.set(this.cmsImagesService.rawUrl(response.id));
      this.form.markAsDirty();
    } catch (error) {
      this.coverErrorMessage.set(processApiError(error));
    } finally {
      this.coverMobileProcessing.set(false);
      input.value = '';
    }
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.form.invalid) {
      return;
    }

    this.saving.set(true);
    try {
      this.contentEditor?.normalizeForSave();
      if (this.isNew()) {
        const created = await this.cmsPostsService.create(this.tipo());
        await this.cmsPostsService.update(created.id, this.form.getRawValue());
        await this.router.navigate(
          ['/painel/cms', this.tipoRouteSegment(), created.id, 'editar'],
          { replaceUrl: true }
        );
        return;
      }

      await this.cmsPostsService.update(this.id(), this.form.getRawValue());
      this.submitted.set(false);
      this.form.markAsPristine();
      this.hasUnsavedChanges.set(false);
      await this.load();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async submitForReview(): Promise<void> {
    await this.runAction(async () => {
      await this.cmsPostsService.submitForReview(this.id());
    });
  }

  protected async approve(): Promise<void> {
    await this.runAction(async () => {
      await this.cmsPostsService.approve(this.id());
    });
  }

  protected openRejectModal(): void {
    this.rejectNotes.set('');
    this.rejectModalOpen.set(true);
  }

  protected closeRejectModal(): void {
    this.rejectModalOpen.set(false);
    this.rejectNotes.set('');
  }

  protected async confirmReject(): Promise<void> {
    const notes = this.rejectNotes().trim();
    if (!notes) {
      this.errorMessage.set('Informe o motivo da reprovação.');
      return;
    }

    this.closeRejectModal();
    await this.runAction(async () => {
      await this.cmsPostsService.reject(this.id(), notes);
    });
  }

  protected openConfirmModal(title: string, text: string, action: () => Promise<void>): void {
    this.confirmModalTitle.set(title);
    this.confirmModalText.set(text);
    this.confirmAction.set(action);
    this.confirmModalOpen.set(true);
  }

  protected closeConfirmModal(): void {
    this.confirmModalOpen.set(false);
    this.confirmAction.set(null);
  }

  protected async confirmModal(): Promise<void> {
    const action = this.confirmAction();
    this.closeConfirmModal();
    if (!action) {
      return;
    }
    await this.runAction(action);
  }

  protected async publish(): Promise<void> {
    this.openConfirmModal(
      'Publicar conteúdo',
      'A publicação vai disponibilizar este conteúdo para a vitrine quando a área pública do CMS estiver ativa.',
      async () => {
        await this.cmsPostsService.publish(this.id());
      }
    );
  }

  protected async unpublish(): Promise<void> {
    this.openConfirmModal(
      'Despublicar conteúdo',
      'O conteúdo deixará de ficar marcado como publicado. O rascunho continua salvo.',
      async () => {
        await this.cmsPostsService.unpublish(this.id());
      }
    );
  }

  protected async archive(): Promise<void> {
    this.openConfirmModal(
      'Arquivar conteúdo',
      'Conteúdos arquivados saem do fluxo principal e não podem ser publicados até serem recriados.',
      async () => {
        await this.cmsPostsService.archive(this.id());
      }
    );
  }

  protected async deletePost(): Promise<void> {
    if (this.isNew()) {
      await this.goBack();
      return;
    }
    this.openConfirmModal(
      'Excluir conteúdo',
      'Essa ação remove o conteúdo permanentemente. Esta operação não pode ser desfeita.',
      async () => {
        await this.cmsPostsService.delete(this.id());
        await this.goBack();
      }
    );
  }

  protected async goBack(): Promise<void> {
    await this.router.navigate(['/painel/cms', this.tipoRouteSegment()]);
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.saving.set(true);
    this.errorMessage.set('');
    try {
      await action();
      await this.load();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.saving.set(false);
    }
  }

  private tipoRouteSegment(): string {
    switch (this.tipo().toUpperCase()) {
      case 'CONTO':
        return 'contos';
      case 'ARTIGO':
        return 'artigos';
      default:
        return 'blog';
    }
  }
}
