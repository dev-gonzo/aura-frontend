import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { maxWordCountValidator } from '../../../../core/validators/max-word-count.validator';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormCheckboxComponent } from '../../../../shared/components/forms/checkbox/form-checkbox.component';
import { ImageUploadComponent } from '../../../../shared/components/forms/image-upload/image-upload.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../../../shared/components/forms/select/form-select.component';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea/form-textarea.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { UsuarioListItem, UsuariosService } from '../../../usuarios/services/usuarios.service';
import {
  AutorDetail,
  AutorPayload,
  AutoresService,
} from '../../services/autores.service';
import {
  ProcessedAuthorPhoto,
  processAuthorPhoto,
} from '../../utils/process-author-photo';

type AutorFormField =
  | 'usuario_id'
  | 'nome_completo'
  | 'nome_publico'
  | 'email'
  | 'email_privado'
  | 'whatsapp'
  | 'whatsapp_privado'
  | 'instagram'
  | 'instagram_privado'
  | 'wattpad'
  | 'wattpad_privado'
  | 'facebook'
  | 'facebook_privado'
  | 'x_twitter'
  | 'x_twitter_privado'
  | 'tiktok'
  | 'tiktok_privado'
  | 'youtube'
  | 'youtube_privado'
  | 'linkedin'
  | 'linkedin_privado'
  | 'nacionalidade'
  | 'biografia'
  | 'status';

@Component({
  selector: 'app-autor-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormInputComponent,
    FormSelectComponent,
    FormCheckboxComponent,
    FormTextareaComponent,
    ImageUploadComponent,
    ButtonComponent,
  ],
  templateUrl: './autor-form.page.html',
  styleUrl: './autor-form.page.css'
})
export class AutorFormPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly autoresService = inject(AutoresService);
  private readonly usuariosService = inject(UsuariosService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly processingPhoto = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly photoErrorMessage = signal('');
  protected readonly photoMeta = signal<ProcessedAuthorPhoto | null>(null);
  protected readonly photoPreviewFailed = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingAuthor = signal<AutorDetail | null>(null);
  protected readonly serverFieldErrors = signal<Partial<Record<AutorFormField, string>>>({});
  protected readonly userOptions = signal<FormSelectOption[]>([]);
  protected readonly statusOptions: FormSelectOption[] = [
    { value: 'ATIVO', label: 'Ativo' },
    { value: 'INATIVO', label: 'Inativo' },
  ];
  protected readonly title = computed(() =>
    this.editingId() ? 'Editar autor' : 'Cadastrar novo autor'
  );
  protected readonly currentPhotoPreview = computed(() => {
    if (this.photoMeta()) {
      return this.photoMeta()!.previewUrl;
    }

    const photo = this.editingAuthor()?.foto;
    if (!photo?.base64) {
      return null;
    }

    return `data:${photo.mime};base64,${photo.base64}`;
  });
  protected readonly shouldShowPhotoPreview = computed(
    () => !!this.currentPhotoPreview() && !this.photoPreviewFailed()
  );
  protected readonly form = this.formBuilder.nonNullable.group({
    usuario_id: [''],
    nome_completo: ['', Validators.required],
    nome_publico: [''],
    email: ['', Validators.email],
    email_privado: [false],
    whatsapp: [''],
    whatsapp_privado: [false],
    instagram: [''],
    instagram_privado: [false],
    wattpad: [''],
    wattpad_privado: [false],
    facebook: [''],
    facebook_privado: [false],
    x_twitter: [''],
    x_twitter_privado: [false],
    tiktok: [''],
    tiktok_privado: [false],
    youtube: [''],
    youtube_privado: [false],
    linkedin: [''],
    linkedin_privado: [false],
    nacionalidade: [''],
    biografia: ['', [maxWordCountValidator(220)]],
    status: ['ATIVO', Validators.required],
  });

  constructor() {
    this.watchFieldChanges();
    void this.loadUsers();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.handleRoute(params.get('id'));
    });
  }

  protected async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.processingPhoto.set(true);
    this.photoErrorMessage.set('');
    this.photoPreviewFailed.set(false);

    try {
      this.photoMeta.set(await processAuthorPhoto(file));
    } catch (error) {
      this.photoMeta.set(null);
      this.photoErrorMessage.set(processApiError(error));
    } finally {
      this.processingPhoto.set(false);
      input.value = '';
    }
  }

  protected handlePhotoPreviewLoad(): void {
    this.photoPreviewFailed.set(false);
  }

  protected handlePhotoPreviewError(event: Event): void {
    const imageElement = event.target as HTMLImageElement | null;
    const currentPreview = this.currentPhotoPreview();
    const failedSource = imageElement?.currentSrc || imageElement?.src || '';

    if (!currentPreview) {
      this.photoPreviewFailed.set(true);
      return;
    }

    if (failedSource && !failedSource.includes(currentPreview)) {
      return;
    }

    this.photoPreviewFailed.set(true);
  }

  protected hasFieldError(field: AutorFormField): boolean {
    const control = this.form.controls[field];
    return !!this.serverFieldErrors()[field] || (control.invalid && (control.touched || this.submitted()));
  }

  protected getFieldError(field: AutorFormField): string {
    const serverError = this.serverFieldErrors()[field];
    if (serverError) {
      return serverError;
    }

    const control = this.form.controls[field];
    if (!control.invalid || (!control.touched && !this.submitted())) {
      return '';
    }

    if (!control.errors) {
      return '';
    }

    if (control.errors['required']) {
      switch (field) {
        case 'nome_completo':
          return 'Informe o nome completo do autor.';
        case 'status':
          return 'Selecione o status do autor.';
        default:
          return 'Preencha este campo.';
      }
    }

    if (control.errors['email']) {
      return 'Informe um email válido.';
    }

    if (control.errors['maxWords']) {
      return 'A biografia deve ter no máximo 220 palavras.';
    }

    return 'Campo inválido.';
  }

  protected hasPhotoError(): boolean {
    return !!this.photoErrorMessage();
  }

  protected getPhotoError(): string {
    return this.photoErrorMessage();
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.clearServerErrors();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    try {
      const payload = this.buildPayload();

      if (this.editingId()) {
        await this.autoresService.update(this.editingId()!, payload);
        this.successMessage.set('Autor atualizado com sucesso.');
      } else {
        await this.autoresService.create(payload);
        this.successMessage.set('Autor cadastrado com sucesso.');
      }

      await this.router.navigate(['/autores']);
    } catch (error) {
      const message = processApiError(error);
      if (!this.applyServerErrors(message)) {
        this.errorMessage.set(message);
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async loadUsers(): Promise<void> {
    try {
      const response = await this.usuariosService.list({ page: 1, page_size: 200 });
      this.userOptions.set(response.items.map(mapUserToOption));
    } catch {
      this.userOptions.set([]);
    }
  }

  private async handleRoute(id: string | null): Promise<void> {
    const normalizedId = id?.trim() || null;
    this.editingId.set(normalizedId);
    this.editingAuthor.set(null);
    this.photoMeta.set(null);
    this.photoErrorMessage.set('');
    this.photoPreviewFailed.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.submitted.set(false);
    this.clearServerErrors();
    this.form.reset({
      usuario_id: '',
      nome_completo: '',
      nome_publico: '',
      email: '',
      email_privado: false,
      whatsapp: '',
      whatsapp_privado: false,
      instagram: '',
      instagram_privado: false,
      wattpad: '',
      wattpad_privado: false,
      facebook: '',
      facebook_privado: false,
      x_twitter: '',
      x_twitter_privado: false,
      tiktok: '',
      tiktok_privado: false,
      youtube: '',
      youtube_privado: false,
      linkedin: '',
      linkedin_privado: false,
      nacionalidade: '',
      biografia: '',
      status: 'ATIVO',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();

    if (!normalizedId) {
      return;
    }

    this.loading.set(true);

    try {
      const author = await this.autoresService.findById(normalizedId);
      this.editingAuthor.set(author);
      this.form.patchValue({
        usuario_id: author.usuario_id ?? '',
        nome_completo: author.nome_completo,
        nome_publico: author.nome_publico ?? '',
        email: author.email ?? '',
        email_privado: author.email_privado,
        whatsapp: author.whatsapp ?? '',
        whatsapp_privado: author.whatsapp_privado,
        instagram: author.instagram ?? '',
        instagram_privado: author.instagram_privado,
        wattpad: author.wattpad ?? '',
        wattpad_privado: author.wattpad_privado,
        facebook: author.facebook ?? '',
        facebook_privado: author.facebook_privado,
        x_twitter: author.x_twitter ?? '',
        x_twitter_privado: author.x_twitter_privado,
        tiktok: author.tiktok ?? '',
        tiktok_privado: author.tiktok_privado,
        youtube: author.youtube ?? '',
        youtube_privado: author.youtube_privado,
        linkedin: author.linkedin ?? '',
        linkedin_privado: author.linkedin_privado,
        nacionalidade: author.nacionalidade ?? '',
        biografia: author.biografia ?? '',
        status: author.status,
      });
      await this.ensureCurrentUserOption(author.usuario_id, author.usuario_nome);
      this.form.markAsPristine();
      this.form.markAsUntouched();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private async ensureCurrentUserOption(
    userId?: string | null,
    userName?: string | null
  ): Promise<void> {
    if (!userId || this.userOptions().some((option) => option.value === userId)) {
      return;
    }

    if (userName?.trim()) {
      this.userOptions.update((items) => [{ value: userId, label: userName }, ...items]);
      return;
    }

    const user = await this.usuariosService.findById(userId);
    if (!user) {
      return;
    }

    this.userOptions.update((items) => [mapUserToOption(user), ...items]);
  }

  private buildPayload(): AutorPayload {
    const value = this.form.getRawValue();

    return {
      usuario_id: value.usuario_id || null,
      nome_completo: value.nome_completo.trim(),
      nome_publico: value.nome_publico.trim() || undefined,
      email: value.email.trim() || undefined,
      email_privado: value.email_privado,
      whatsapp: value.whatsapp.trim() || undefined,
      whatsapp_privado: value.whatsapp_privado,
      instagram: value.instagram.trim() || undefined,
      instagram_privado: value.instagram_privado,
      wattpad: value.wattpad.trim() || undefined,
      wattpad_privado: value.wattpad_privado,
      facebook: value.facebook.trim() || undefined,
      facebook_privado: value.facebook_privado,
      x_twitter: value.x_twitter.trim() || undefined,
      x_twitter_privado: value.x_twitter_privado,
      tiktok: value.tiktok.trim() || undefined,
      tiktok_privado: value.tiktok_privado,
      youtube: value.youtube.trim() || undefined,
      youtube_privado: value.youtube_privado,
      linkedin: value.linkedin.trim() || undefined,
      linkedin_privado: value.linkedin_privado,
      nacionalidade: value.nacionalidade.trim() || undefined,
      biografia: value.biografia.trim() || undefined,
      foto: this.photoMeta()?.payload ?? this.editingAuthor()?.foto ?? null,
      status: value.status as 'ATIVO' | 'INATIVO',
    };
  }

  private watchFieldChanges(): void {
    const fields: AutorFormField[] = [
      'usuario_id',
      'nome_completo',
      'nome_publico',
      'email',
      'email_privado',
      'whatsapp',
      'whatsapp_privado',
      'instagram',
      'instagram_privado',
      'wattpad',
      'wattpad_privado',
      'facebook',
      'facebook_privado',
      'x_twitter',
      'x_twitter_privado',
      'tiktok',
      'tiktok_privado',
      'youtube',
      'youtube_privado',
      'linkedin',
      'linkedin_privado',
      'nacionalidade',
      'biografia',
      'status',
    ];

    for (const field of fields) {
      this.watchField(field);
    }
  }

  private watchField<K extends AutorFormField>(field: K): void {
    const subscription = this.form.controls[field].valueChanges.subscribe(() =>
      this.clearServerFieldError(field)
    );
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  private clearServerErrors(): void {
    this.serverFieldErrors.set({});
    this.photoErrorMessage.set('');
  }

  private clearServerFieldError(field: AutorFormField): void {
    const current = this.serverFieldErrors();
    if (!current[field]) {
      return;
    }

    const next = { ...current };
    delete next[field];
    this.serverFieldErrors.set(next);
  }

  private applyServerErrors(message: string): boolean {
    const normalized = message.toLowerCase();
    const nextErrors: Partial<Record<AutorFormField, string>> = {};

    if (normalized.includes('nome do autor')) {
      nextErrors.nome_completo = 'Informe o nome completo do autor.';
    }
    if (normalized.includes('email do autor')) {
      nextErrors.email = message;
    }
    if (normalized.includes('status do autor')) {
      nextErrors.status = 'Selecione um status válido.';
    }
    if (normalized.includes('foto do autor')) {
      this.photoErrorMessage.set(message);
    }

    if (Object.keys(nextErrors).length === 0 && !this.photoErrorMessage()) {
      return false;
    }

    this.serverFieldErrors.set(nextErrors);
    return true;
  }
}

function mapUserToOption(user: UsuarioListItem): FormSelectOption {
  const profileLabel = user.papeis.length > 0 ? ` • ${user.papeis.join(', ')}` : '';
  return {
    value: user.id,
    label: `${user.nome_completo}${profileLabel}`,
  };
}
