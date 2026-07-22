import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { ImageUploadComponent } from '../../../../shared/components/forms/image-upload/image-upload.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { FormSelectComponent } from '../../../../shared/components/forms/select/form-select.component';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea/form-textarea.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import {
  EditalAttachmentPayload,
  EditalDetail,
  EditalImagePayload,
  EditaisService,
} from '../../services/editais.service';
import { processEditalCover, ProcessedEditalCover } from '../../utils/process-edital-cover';
import { EDITAL_STATUS_OPTIONS } from '../../utils/edital-status';

type EditalFormField =
  | 'titulo'
  | 'descricao'
  | 'taxa_inscricao'
  | 'taxa_publicacao'
  | 'status'
  | 'data_inicio'
  | 'data_fim'
  | 'total_vagas'
  | 'data_prevista_publicacao';

@Component({
  selector: 'app-edital-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ImageUploadComponent,
    FormInputComponent,
    FormSelectComponent,
    FormTextareaComponent,
    ButtonComponent,
  ],
  templateUrl: './edital-form.page.html',
  styleUrl: './edital-form.page.css'
})
export class EditalFormPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly editaisService = inject(EditaisService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly processingCover = signal(false);
  protected readonly coverErrorMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly attachmentErrorMessage = signal('');
  protected readonly coverMeta = signal<ProcessedEditalCover | null>(null);
  protected readonly coverPreviewFailed = signal(false);
  protected readonly selectedAttachment = signal<File | null>(null);
  protected readonly attachmentMarkedForRemoval = signal(false);
  protected readonly activeFeeTooltip = signal<'inscricao' | 'publicacao' | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingEdital = signal<EditalDetail | null>(null);
  protected readonly statusOptions = EDITAL_STATUS_OPTIONS;
  protected readonly title = computed(() =>
    this.editingId() ? 'Editar edital' : 'Cadastrar novo edital'
  );
  protected readonly currentCoverPreview = computed(() => {
    if (this.coverMeta()) {
      return this.coverMeta()!.previewUrl;
    }

    const edital = this.editingEdital();
    if (!edital?.capa?.base64) {
      return null;
    }

    return `data:${edital.capa.mime};base64,${edital.capa.base64}`;
  });
  protected readonly shouldShowCoverPreview = computed(
    () => !!this.currentCoverPreview() && !this.coverPreviewFailed()
  );
  protected readonly currentAttachment = computed(() => {
    if (this.selectedAttachment()) {
      return null;
    }

    if (this.attachmentMarkedForRemoval()) {
      return null;
    }

    return this.editingEdital()?.anexo ?? null;
  });
  protected readonly form = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(255)]],
    descricao: ['', Validators.required],
    taxa_inscricao: [''],
    taxa_inscricao_gratis: [false],
    taxa_publicacao: [''],
    taxa_publicacao_gratis: [false],
    status: ['RASCUNHO', Validators.required],
    data_inicio: [''],
    data_fim: [''],
    total_vagas: [''],
    data_prevista_publicacao: [''],
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.handleRoute(params.get('id'));
    });
  }

  protected async onCoverSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.processingCover.set(true);
    this.errorMessage.set('');
    this.coverErrorMessage.set('');
    this.coverPreviewFailed.set(false);

    try {
      this.coverMeta.set(await processEditalCover(file));
    } catch (error) {
      this.coverMeta.set(null);
      this.coverErrorMessage.set(processApiError(error));
    } finally {
      this.processingCover.set(false);
      input.value = '';
    }
  }

  protected handleCoverPreviewLoad(): void {
    this.coverPreviewFailed.set(false);
  }

  protected handleCoverPreviewError(event: Event): void {
    const imageElement = event.target as HTMLImageElement | null;
    const currentPreview = this.currentCoverPreview();
    const failedSource = imageElement?.currentSrc || imageElement?.src || '';

    if (!currentPreview) {
      this.coverPreviewFailed.set(true);
      return;
    }

    if (failedSource && !failedSource.includes(currentPreview)) {
      return;
    }

    this.coverPreviewFailed.set(true);
  }

  protected onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedAttachment.set(input.files?.item(0) ?? null);
    this.attachmentMarkedForRemoval.set(false);
    this.attachmentErrorMessage.set('');
  }

  protected clearSelectedAttachment(input: HTMLInputElement): void {
    input.value = '';
    this.selectedAttachment.set(null);
    this.attachmentErrorMessage.set('');
  }

  protected async removeAttachment(input: HTMLInputElement): Promise<void> {
    const hasStoredAttachment = !!this.currentAttachment();
    const hadSelectedAttachment = !!this.selectedAttachment();

    if (!hasStoredAttachment && !hadSelectedAttachment) {
      return;
    }

    if (!this.editingId()) {
      this.clearSelectedAttachment(input);
      return;
    }

    if (!this.canPersistForm()) {
      this.submitted.set(true);
      this.form.markAllAsTouched();
      return;
    }

    const previousSelection = this.selectedAttachment();
    input.value = '';
    this.selectedAttachment.set(null);
    this.attachmentMarkedForRemoval.set(true);
    this.attachmentErrorMessage.set('');

    const saved = await this.persistForm(true);
    if (!saved) {
      this.selectedAttachment.set(previousSelection);
      this.attachmentMarkedForRemoval.set(false);
    }
  }

  protected async submit(): Promise<void> {
    await this.persistForm(false);
  }

  protected toggleFeeTooltip(target: 'inscricao' | 'publicacao'): void {
    this.activeFeeTooltip.set(this.activeFeeTooltip() === target ? null : target);
  }

  protected isFeeTooltipOpen(target: 'inscricao' | 'publicacao'): boolean {
    return this.activeFeeTooltip() === target;
  }

  protected toggleFreeFee(field: 'taxa_inscricao' | 'taxa_publicacao', checked: boolean): void {
    const freeField = field === 'taxa_inscricao' ? 'taxa_inscricao_gratis' : 'taxa_publicacao_gratis';
    this.form.controls[freeField].setValue(checked);
    if (checked) {
      this.form.controls[field].setValue('0,00');
      this.form.controls[field].disable();
      return;
    }

    this.form.controls[field].enable();
    if (this.isZeroFeeValue(this.form.controls[field].value)) {
      this.form.controls[field].setValue('');
    }
  }

  protected onFeeInput(field: 'taxa_inscricao' | 'taxa_publicacao', event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const formattedValue = this.formatFeeInput(input?.value ?? '');
    this.form.controls[field].setValue(formattedValue, { emitEvent: false });

    if (input) {
      input.value = formattedValue;
    }
  }

  protected hasFieldError(field: EditalFormField): boolean {
    if (field === 'taxa_inscricao' || field === 'taxa_publicacao') {
      return this.hasFeeError(field);
    }

    const control = this.form.controls[field];
    if (field === 'data_fim' && this.hasDateRangeError()) {
      return control.touched || this.submitted();
    }

    return control.invalid && (control.touched || this.submitted());
  }

  protected getFieldError(field: EditalFormField): string {
    if (!this.hasFieldError(field)) {
      return '';
    }

    const control = this.form.controls[field];

    if (control.errors?.['required']) {
      switch (field) {
        case 'titulo':
          return 'Informe o título do edital.';
        case 'descricao':
          return 'Informe a descrição do edital.';
        case 'taxa_inscricao':
          return 'Informe a taxa de inscrição ou marque como gratuita.';
        case 'taxa_publicacao':
          return 'Informe a taxa de publicação ou marque como gratuita.';
        case 'status':
          return 'Selecione o status do edital.';
        default:
          return 'Preencha este campo.';
      }
    }

    if (control.errors?.['maxlength']) {
      return 'O título do edital deve ter no máximo 255 caracteres.';
    }

    if (control.errors?.['min']) {
      return 'Informe um valor maior ou igual a zero.';
    }

    if (field === 'data_fim' && this.hasDateRangeError()) {
      return 'A data de fim deve ser maior ou igual à data de início.';
    }

    if (field === 'taxa_inscricao' || field === 'taxa_publicacao') {
      return 'Informe um valor maior ou igual a zero ou marque como gratuita.';
    }

    return '';
  }

  protected hasCoverError(): boolean {
    return (!!this.coverErrorMessage() && (this.submitted() || this.processingCover() === false)) || (!this.currentCoverPayload() && this.submitted());
  }

  protected getCoverError(): string {
    if (this.coverErrorMessage()) {
      return this.coverErrorMessage();
    }

    return this.hasCoverError() ? 'Envie a arte de capa do edital.' : '';
  }

  protected formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  private async handleRoute(id: string | null): Promise<void> {
    const normalizedId = id?.trim() || null;
    this.editingId.set(normalizedId);
    this.editingEdital.set(null);
    this.coverMeta.set(null);
    this.coverErrorMessage.set('');
    this.selectedAttachment.set(null);
    this.attachmentMarkedForRemoval.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.attachmentErrorMessage.set('');
    this.submitted.set(false);
    this.coverPreviewFailed.set(false);
    this.activeFeeTooltip.set(null);
    this.form.reset({
      titulo: '',
      descricao: '',
      taxa_inscricao: '',
      taxa_inscricao_gratis: false,
      taxa_publicacao: '',
      taxa_publicacao_gratis: false,
      status: 'RASCUNHO',
      data_inicio: '',
      data_fim: '',
      total_vagas: '',
      data_prevista_publicacao: '',
    });
    this.form.controls.taxa_inscricao.enable();
    this.form.controls.taxa_publicacao.enable();

    if (!normalizedId) {
      return;
    }

    this.loading.set(true);
    try {
      const edital = await this.editaisService.findById(normalizedId);
      this.editingEdital.set(edital);
      this.form.patchValue({
        titulo: edital.titulo,
        descricao: edital.descricao,
        taxa_inscricao:
          edital.taxa_inscricao != null && edital.taxa_inscricao > 0 ? edital.taxa_inscricao.toFixed(2) : '',
        taxa_inscricao_gratis: edital.taxa_inscricao === 0,
        taxa_publicacao:
          edital.taxa_publicacao != null && edital.taxa_publicacao > 0
            ? edital.taxa_publicacao.toFixed(2)
            : '',
        taxa_publicacao_gratis: edital.taxa_publicacao === 0,
        status: edital.status,
        data_inicio: edital.data_inicio ?? '',
        data_fim: edital.data_fim ?? '',
        total_vagas: edital.total_vagas != null ? String(edital.total_vagas) : '',
        data_prevista_publicacao: edital.data_prevista_publicacao ?? '',
      });
      if (edital.taxa_inscricao === 0) {
        this.form.controls.taxa_inscricao.setValue('0,00');
        this.form.controls.taxa_inscricao.disable();
      }
      if (edital.taxa_publicacao === 0) {
        this.form.controls.taxa_publicacao.setValue('0,00');
        this.form.controls.taxa_publicacao.disable();
      }
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private buildPayload(uploadedAttachment: EditalAttachmentPayload | null):
    | {
        capa: EditalImagePayload;
        titulo: string;
        descricao: string;
        anexo: EditalAttachmentPayload | null;
        taxa_inscricao: number | null;
        taxa_publicacao: number | null;
        status: string;
        data_inicio: string;
        data_fim: string;
        total_vagas: number | null;
        data_prevista_publicacao: string;
      }
    | null {
    const capa = this.currentCoverPayload();
    if (!capa) {
      return null;
    }

    const totalVagas = this.form.controls.total_vagas.value.trim();
    const taxaInscricao = this.resolveFeeValue('taxa_inscricao');
    const taxaPublicacao = this.resolveFeeValue('taxa_publicacao');

    return {
      capa,
      titulo: this.form.controls.titulo.value.trim(),
      descricao: this.form.controls.descricao.value.trim(),
      anexo: this.resolveAttachmentPayload(uploadedAttachment),
      taxa_inscricao: taxaInscricao,
      taxa_publicacao: taxaPublicacao,
      status: this.form.controls.status.value,
      data_inicio: this.form.controls.data_inicio.value.trim(),
      data_fim: this.form.controls.data_fim.value.trim(),
      total_vagas: totalVagas ? Number(totalVagas) : null,
      data_prevista_publicacao: this.form.controls.data_prevista_publicacao.value.trim(),
    };
  }

  private currentCoverPayload(): EditalImagePayload | null {
    if (this.coverMeta()) {
      return this.coverMeta()!.payload;
    }

    const cover = this.editingEdital()?.capa;
    return cover?.base64 ? cover : null;
  }

  private resolveAttachmentPayload(
    uploadedAttachment: EditalAttachmentPayload | null
  ): EditalAttachmentPayload | null {
    if (uploadedAttachment) {
      return uploadedAttachment;
    }

    if (this.attachmentMarkedForRemoval()) {
      return null;
    }

    const attachment = this.editingEdital()?.anexo;
    if (!attachment) {
      return null;
    }

    return {
      nome_arquivo: attachment.nome_arquivo,
      content_type: attachment.content_type,
      tamanho_bytes: attachment.tamanho_bytes,
      bucket: attachment.bucket,
      key: attachment.key,
      url: attachment.url,
    };
  }

  private canPersistForm(): boolean {
    return (
      !this.form.invalid &&
      !this.hasCoverError() &&
      !this.hasDateRangeError() &&
      !this.hasFeeError('taxa_inscricao') &&
      !this.hasFeeError('taxa_publicacao')
    );
  }

  private async persistForm(forceRemoveAttachment: boolean): Promise<boolean> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.attachmentErrorMessage.set('');

    if (!this.canPersistForm()) {
      this.form.markAllAsTouched();
      return false;
    }

    this.saving.set(true);

    try {
      let uploadedAttachment: EditalAttachmentPayload | null = null;
      const selectedAttachment = forceRemoveAttachment ? null : this.selectedAttachment();
      if (selectedAttachment) {
        try {
          const uploaded = await this.editaisService.uploadArquivo(selectedAttachment);
          uploadedAttachment = {
            nome_arquivo: uploaded.nome_arquivo,
            content_type: uploaded.content_type,
            tamanho_bytes: uploaded.tamanho_bytes,
            bucket: uploaded.bucket,
            key: uploaded.key,
            url: uploaded.url,
          };
        } catch (error) {
          this.attachmentErrorMessage.set(processApiError(error));
          return false;
        }
      }

      const payload = this.buildPayload(uploadedAttachment);
      if (!payload) {
        return false;
      }

      const response = this.editingId()
        ? await this.editaisService.update(this.editingId()!, payload)
        : await this.editaisService.create(payload);

      this.successMessage.set(
        this.editingId() ? 'Edital atualizado com sucesso.' : 'Edital cadastrado com sucesso.'
      );
      await this.router.navigate(['/editais', response.id]);
      return true;
    } catch (error) {
      this.errorMessage.set(processApiError(error));
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private hasDateRangeError(): boolean {
    const dataInicio = this.form.controls.data_inicio.value.trim();
    const dataFim = this.form.controls.data_fim.value.trim();

    if (!dataInicio || !dataFim) {
      return false;
    }

    return dataFim < dataInicio;
  }

  private hasFeeError(field: 'taxa_inscricao' | 'taxa_publicacao'): boolean {
    const freeField = field === 'taxa_inscricao' ? 'taxa_inscricao_gratis' : 'taxa_publicacao_gratis';
    if (this.form.controls[freeField].value) {
      return false;
    }

    const control = this.form.controls[field];
    const value = control.value.trim().replace(',', '.');
    if (!value) {
      return control.touched || this.submitted();
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) || numericValue < 0;
  }

  private resolveFeeValue(field: 'taxa_inscricao' | 'taxa_publicacao'): number | null {
    const freeField = field === 'taxa_inscricao' ? 'taxa_inscricao_gratis' : 'taxa_publicacao_gratis';
    if (this.form.controls[freeField].value) {
      return 0;
    }

    const rawValue = this.form.controls[field].value.trim().replace(',', '.');
    return rawValue ? Number(rawValue) : null;
  }

  private isZeroFeeValue(value: string): boolean {
    const normalizedValue = value.trim().replace(',', '.');
    return normalizedValue === '0' || normalizedValue === '0.0' || normalizedValue === '0.00';
  }

  private formatFeeInput(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      return '';
    }

    const normalizedValue = Number(digits) / 100;
    return normalizedValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
