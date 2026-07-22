import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
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
import { AutoresService } from '../../../autores/services/autores.service';
import { LivroDetail, LivroPayload, LivrosService } from '../../services/livros.service';
import {
  ProcessedBookCover,
  processBookCover,
} from '../../utils/process-book-cover';

type LivroFormField =
  | 'autor_id'
  | 'titulo'
  | 'subtitulo'
  | 'sinopse'
  | 'isbn'
  | 'codigo_barra'
  | 'status'
  | 'possui_formato_fisico'
  | 'possui_formato_digital'
  | 'edicao'
  | 'detalhes_edicao'
  | 'tipo_capa'
  | 'idioma'
  | 'numero_paginas'
  | 'genero'
  | 'preco_venda_fisico'
  | 'preco_venda_digital'
  | 'canal_venda_digital'
  | 'url_compra_digital'
  | 'custo_impressao'
  | 'estoque_disponivel'
  | 'estoque_minimo'
  | 'peso_gramas'
  | 'largura_cm'
  | 'altura_cm'
  | 'profundidade_cm'
  | 'data_publicacao_prevista'
  | 'data_publicacao';

@Component({
  selector: 'app-livro-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormInputComponent,
    FormSelectComponent,
    FormTextareaComponent,
    ImageUploadComponent,
    FormCheckboxComponent,
    ButtonComponent,
  ],
  templateUrl: './livro-form.page.html',
  styleUrl: './livro-form.page.css'
})
export class LivroFormPage {
  @ViewChild('synopsisEditor') private synopsisEditor?: ElementRef<HTMLTextAreaElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly livrosService = inject(LivrosService);
  private readonly autoresService = inject(AutoresService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly validatingIdentifiers = signal(false);
  protected readonly submitted = signal(false);
  protected readonly processingCover = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly coverErrorMessage = signal('');
  protected readonly coverMeta = signal<ProcessedBookCover | null>(null);
  protected readonly coverPreviewFailed = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingBook = signal<LivroDetail | null>(null);
  protected readonly serverFieldErrors = signal<Partial<Record<LivroFormField, string>>>({});
  protected readonly authorOptions = signal<FormSelectOption[]>([]);
  protected readonly title = computed(() =>
    this.editingId() ? 'Editar livro' : 'Cadastrar novo livro'
  );
  protected readonly statusOptions: FormSelectOption[] = [
    { value: 'RASCUNHO', label: 'Rascunho' },
    { value: 'EM_PRODUCAO', label: 'Em produção' },
    { value: 'PRONTO_PARA_VENDA', label: 'Pronto para venda' },
    { value: 'PUBLICADO', label: 'Publicado' },
    { value: 'ESGOTADO', label: 'Esgotado' },
    { value: 'INATIVO', label: 'Inativo' },
  ];
  protected readonly coverTypeOptions: FormSelectOption[] = [
    { value: 'BROCHURA', label: 'Brochura' },
    { value: 'CAPA_DURA', label: 'Capa dura' },
    { value: 'ESPIRAL', label: 'Espiral' },
    { value: 'GRAMPEADO', label: 'Grampeado' },
    { value: 'LUXO', label: 'Luxo' },
    { value: 'OUTRO', label: 'Outro' },
  ];
  protected readonly digitalChannelOptions: FormSelectOption[] = [
    { value: 'AMAZON', label: 'Amazon / Kindle' },
    { value: 'LINK_EXTERNO', label: 'Outro link externo' },
  ];
  protected readonly hasPhysicalFormat = computed(() => this.form.controls.possui_formato_fisico.value);
  protected readonly hasDigitalFormat = computed(() => this.form.controls.possui_formato_digital.value);
  protected readonly shouldShowPhysicalDetails = computed(() => this.hasPhysicalFormat());
  protected readonly shouldShowDigitalSalesFields = computed(() => this.hasDigitalFormat());
  protected readonly shouldShowStockFields = computed(
    () => this.hasPhysicalFormat() && this.form.controls.controlar_estoque.value
  );
  protected readonly currentCoverPreview = computed(() => {
    if (this.coverMeta()) {
      return this.coverMeta()!.previewUrl;
    }

    const cover = this.editingBook()?.capa;
    if (!cover?.base64) {
      return null;
    }

    return `data:${cover.mime};base64,${cover.base64}`;
  });
  protected readonly shouldShowCoverPreview = computed(
    () => !!this.currentCoverPreview() && !this.coverPreviewFailed()
  );
  protected readonly form = this.formBuilder.nonNullable.group({
    autor_id: ['', Validators.required],
    titulo: ['', Validators.required],
    subtitulo: [''],
    sinopse: [''],
    isbn: [''],
    codigo_barra: [''],
    status: ['RASCUNHO', Validators.required],
    possui_formato_fisico: [true],
    possui_formato_digital: [false],
    edicao: [''],
    detalhes_edicao: [''],
    tipo_capa: ['BROCHURA'],
    idioma: ['Português'],
    numero_paginas: [''],
    genero: [''],
    preco_venda_fisico: [''],
    preco_venda_digital: [''],
    canal_venda_digital: ['AMAZON'],
    url_compra_digital: [''],
    custo_impressao: [''],
    controlar_estoque: [true],
    estoque_disponivel: ['0'],
    estoque_minimo: ['0'],
    peso_gramas: [''],
    largura_cm: [''],
    altura_cm: [''],
    profundidade_cm: [''],
    data_publicacao_prevista: [''],
    data_publicacao: [''],
    ativo: [true],
  });

  constructor() {
    this.watchFieldChanges();
    this.watchStockRules();
    void this.loadAuthors();

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
    this.coverErrorMessage.set('');
    this.coverPreviewFailed.set(false);

    try {
      this.coverMeta.set(await processBookCover(file));
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

  protected hasFieldError(field: LivroFormField): boolean {
    const control = this.form.controls[field];
    return !!this.serverFieldErrors()[field] || (control.invalid && (control.touched || this.submitted()));
  }

  protected getFieldError(field: LivroFormField): string {
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
        case 'autor_id':
          return 'Selecione o autor do livro.';
        case 'titulo':
          return 'Informe o título do livro.';
        case 'status':
          return 'Selecione o status do livro.';
        case 'possui_formato_fisico':
        case 'possui_formato_digital':
          return 'Selecione ao menos um formato de venda.';
        default:
          return 'Preencha este campo.';
      }
    }

    return 'Campo inválido.';
  }

  protected hasCoverError(): boolean {
    return !!this.coverErrorMessage();
  }

  protected getCoverError(): string {
    return this.coverErrorMessage();
  }

  protected normalizeDigitField(
    field: 'isbn' | 'codigo_barra',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const digits = onlyDigits(input.value).slice(0, 13);
    this.form.controls[field].setValue(digits, { emitEvent: false });
    input.value = digits;
  }

  protected formatMoneyField(
    field: 'preco_venda_fisico' | 'preco_venda_digital' | 'custo_impressao',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const formattedValue = formatCurrencyInput(input.value);
    this.form.controls[field].setValue(formattedValue, { emitEvent: false });
    input.value = formattedValue;
  }

  protected normalizeIntegerField(
    field: 'numero_paginas' | 'estoque_disponivel' | 'estoque_minimo' | 'peso_gramas',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const digits = onlyDigits(input.value);
    this.form.controls[field].setValue(digits, { emitEvent: false });
    input.value = digits;
  }

  protected normalizeDecimalField(
    field: 'largura_cm' | 'altura_cm' | 'profundidade_cm',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const normalized = normalizeDecimalInput(input.value);
    this.form.controls[field].setValue(normalized, { emitEvent: false });
    input.value = normalized;
  }

  protected applySynopsisMarkdown(
    action: 'title' | 'subtitle' | 'bold' | 'italic' | 'link' | 'list'
  ): void {
    const textarea = this.synopsisEditor?.nativeElement;
    const control = this.form.controls.sinopse;
    const currentValue = control.value ?? '';

    if (!textarea) {
      control.setValue(applyMarkdownSnippet(currentValue, currentValue.length, currentValue.length, action));
      control.markAsDirty();
      control.markAsTouched();
      return;
    }

    const selectionStart = textarea.selectionStart ?? currentValue.length;
    const selectionEnd = textarea.selectionEnd ?? currentValue.length;
    const nextValue = applyMarkdownSnippet(currentValue, selectionStart, selectionEnd, action);

    control.setValue(nextValue);
    control.markAsDirty();
    control.markAsTouched();

    queueMicrotask(() => {
      textarea.focus();
      const nextPosition = getMarkdownCursorPosition(nextValue, selectionStart, selectionEnd, action);
      textarea.setSelectionRange(nextPosition, nextPosition);
    });
  }

  protected getInventoryHelperText(): string {
    if (!this.hasPhysicalFormat()) {
      return 'Sem formato físico, não há gestão de estoque.';
    }

    if (!this.form.controls.controlar_estoque.value) {
      return 'Título físico sem controle de estoque.';
    }

    return 'Defina saldo inicial e estoque mínimo para operação física.';
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.clearServerErrors();

    if (!this.form.controls.possui_formato_fisico.value && !this.form.controls.possui_formato_digital.value) {
      this.serverFieldErrors.set({
        possui_formato_fisico: 'Selecione ao menos um formato de venda.',
        possui_formato_digital: 'Selecione ao menos um formato de venda.',
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const identifiersValid = await this.validateIdentifiers();
    if (!identifiersValid) {
      return;
    }

    this.saving.set(true);

    try {
      const payload = this.buildPayload();
      if (this.editingId()) {
        await this.livrosService.update(this.editingId()!, payload);
        this.successMessage.set('Livro atualizado com sucesso.');
      } else {
        await this.livrosService.create(payload);
        this.successMessage.set('Livro cadastrado com sucesso.');
      }

      await this.router.navigate(['/livros']);
    } catch (error) {
      const message = processApiError(error);
      if (!this.applyServerErrors(message)) {
        this.errorMessage.set(message);
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async loadAuthors(): Promise<void> {
    try {
      const authors = await this.autoresService.list();
      this.authorOptions.set(
        authors.map((author) => ({
          value: author.id,
          label: author.nome_exibicao,
        }))
      );
    } catch {
      this.authorOptions.set([]);
    }
  }

  private async handleRoute(id: string | null): Promise<void> {
    const normalizedId = id?.trim() || null;
    this.editingId.set(normalizedId);
    this.editingBook.set(null);
    this.coverMeta.set(null);
    this.coverErrorMessage.set('');
    this.coverPreviewFailed.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.submitted.set(false);
    this.clearServerErrors();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.form.reset({
      autor_id: '',
      titulo: '',
      subtitulo: '',
      sinopse: '',
      isbn: '',
      codigo_barra: '',
      status: 'RASCUNHO',
      possui_formato_fisico: true,
      possui_formato_digital: false,
      edicao: '',
      detalhes_edicao: '',
      tipo_capa: 'BROCHURA',
      idioma: 'Português',
      numero_paginas: '',
      genero: '',
      preco_venda_fisico: '',
      preco_venda_digital: '',
      canal_venda_digital: 'AMAZON',
      url_compra_digital: '',
      custo_impressao: '',
      controlar_estoque: true,
      estoque_disponivel: '0',
      estoque_minimo: '0',
      peso_gramas: '',
      largura_cm: '',
      altura_cm: '',
      profundidade_cm: '',
      data_publicacao_prevista: '',
      data_publicacao: '',
      ativo: true,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.syncStockControls();

    if (!normalizedId) {
      return;
    }

    this.loading.set(true);

    try {
      const book = await this.livrosService.findById(normalizedId);
      this.editingBook.set(book);
      this.form.patchValue({
        autor_id: book.autor_id,
        titulo: book.titulo,
        subtitulo: book.subtitulo ?? '',
        sinopse: book.sinopse ?? '',
        isbn: book.isbn ?? '',
        codigo_barra: book.codigo_barra ?? '',
        status: book.status,
        possui_formato_fisico: book.possui_formato_fisico,
        possui_formato_digital: book.possui_formato_digital,
        edicao: book.edicao ?? '',
        detalhes_edicao: book.detalhes_edicao ?? '',
        tipo_capa: book.tipo_capa ?? 'BROCHURA',
        idioma: book.idioma ?? 'Português',
        numero_paginas: book.numero_paginas != null ? String(book.numero_paginas) : '',
        genero: book.genero ?? '',
        preco_venda_fisico:
          book.preco_venda_fisico > 0 ? formatNumberToCurrency(book.preco_venda_fisico) : '',
        preco_venda_digital:
          book.preco_venda_digital > 0 ? formatNumberToCurrency(book.preco_venda_digital) : '',
        canal_venda_digital: book.canal_venda_digital ?? 'AMAZON',
        url_compra_digital: book.url_compra_digital ?? '',
        custo_impressao: book.custo_impressao > 0 ? formatNumberToCurrency(book.custo_impressao) : '',
        controlar_estoque: book.controlar_estoque,
        estoque_disponivel: String(book.estoque_disponivel ?? 0),
        estoque_minimo: String(book.estoque_minimo ?? 0),
        peso_gramas: book.peso_gramas != null ? String(book.peso_gramas) : '',
        largura_cm: book.largura_cm != null ? String(book.largura_cm).replace('.', ',') : '',
        altura_cm: book.altura_cm != null ? String(book.altura_cm).replace('.', ',') : '',
        profundidade_cm: book.profundidade_cm != null ? String(book.profundidade_cm).replace('.', ',') : '',
        data_publicacao_prevista: book.data_publicacao_prevista ?? '',
        data_publicacao: book.data_publicacao ?? '',
        ativo: book.ativo,
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.syncStockControls();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private watchFieldChanges(): void {
    const fields: LivroFormField[] = [
      'autor_id',
      'titulo',
      'subtitulo',
      'sinopse',
      'isbn',
      'codigo_barra',
      'status',
      'possui_formato_fisico',
      'possui_formato_digital',
      'edicao',
      'detalhes_edicao',
      'tipo_capa',
      'idioma',
      'numero_paginas',
      'genero',
      'preco_venda_fisico',
      'preco_venda_digital',
      'canal_venda_digital',
      'url_compra_digital',
      'custo_impressao',
      'estoque_disponivel',
      'estoque_minimo',
      'peso_gramas',
      'largura_cm',
      'altura_cm',
      'profundidade_cm',
      'data_publicacao_prevista',
      'data_publicacao',
    ];

    for (const field of fields) {
      this.watchField(field);
    }
  }

  private watchStockRules(): void {
    this.form.controls.controlar_estoque.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncStockControls());

    this.form.controls.possui_formato_fisico.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncStockControls());

    this.form.controls.possui_formato_digital.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncStockControls());
  }

  private syncStockControls(): void {
    if (!this.form.controls.possui_formato_fisico.value) {
      this.form.controls.controlar_estoque.setValue(false, { emitEvent: false });
      this.form.controls.controlar_estoque.disable({ emitEvent: false });
      this.form.controls.estoque_disponivel.setValue('0', { emitEvent: false });
      this.form.controls.estoque_minimo.setValue('0', { emitEvent: false });
      this.form.controls.custo_impressao.setValue('', { emitEvent: false });
      this.form.controls.estoque_disponivel.disable({ emitEvent: false });
      this.form.controls.estoque_minimo.disable({ emitEvent: false });
      return;
    }

    this.form.controls.controlar_estoque.enable({ emitEvent: false });

    if (this.form.controls.controlar_estoque.value) {
      this.form.controls.estoque_disponivel.enable({ emitEvent: false });
      this.form.controls.estoque_minimo.enable({ emitEvent: false });
      return;
    }

    this.form.controls.estoque_disponivel.setValue('0', { emitEvent: false });
    this.form.controls.estoque_minimo.setValue('0', { emitEvent: false });
    this.form.controls.estoque_disponivel.disable({ emitEvent: false });
    this.form.controls.estoque_minimo.disable({ emitEvent: false });
  }

  private async validateIdentifiers(): Promise<boolean> {
    this.validatingIdentifiers.set(true);

    try {
      const response = await this.livrosService.validateIdentifiers({
        id: this.editingId() ?? undefined,
        status: this.form.controls.status.value,
        isbn: this.form.controls.isbn.value,
        codigo_barra: this.form.controls.codigo_barra.value,
      });

      if (response.valid) {
        return true;
      }

      const errors = response.erros ?? ['Não foi possível validar ISBN e código de barras.'];
      this.applyIdentifierErrors(errors);
      return false;
    } catch (error) {
      this.errorMessage.set(processApiError(error));
      return false;
    } finally {
      this.validatingIdentifiers.set(false);
    }
  }

  private applyIdentifierErrors(errors: string[]): void {
    const fieldErrors: Partial<Record<LivroFormField, string>> = {};

    for (const error of errors) {
      const normalized = error.toLowerCase();
      const touchesIsbn = normalized.includes('isbn');
      const touchesBarcode = normalized.includes('codigo_barra');

      if (touchesIsbn) {
        fieldErrors.isbn = error;
      }
      if (touchesBarcode) {
        fieldErrors.codigo_barra = error;
      }
    }

    this.serverFieldErrors.set({
      ...this.serverFieldErrors(),
      ...fieldErrors,
    });
  }

  private buildPayload(): LivroPayload {
    const value = this.form.getRawValue();
    const formato = resolveBookFormat(value.possui_formato_fisico, value.possui_formato_digital);
    const controlarEstoque = value.possui_formato_fisico && value.controlar_estoque;
    const precoVendaFisico = parseOptionalCurrency(value.preco_venda_fisico);
    const precoVendaDigital = parseOptionalCurrency(value.preco_venda_digital);

    return {
      autor_id: value.autor_id,
      titulo: value.titulo.trim(),
      subtitulo: value.subtitulo.trim() || undefined,
      sinopse: value.sinopse.trim() || undefined,
      isbn: onlyDigits(value.isbn) || undefined,
      codigo_barra: onlyDigits(value.codigo_barra) || undefined,
      status: value.status,
      formato,
      possui_formato_fisico: value.possui_formato_fisico,
      possui_formato_digital: value.possui_formato_digital,
      edicao: value.edicao.trim() || undefined,
      detalhes_edicao: value.detalhes_edicao.trim() || undefined,
      tipo_capa: value.possui_formato_fisico ? value.tipo_capa || undefined : undefined,
      possui_box: false,
      idioma: value.idioma.trim() || undefined,
      numero_paginas: parseOptionalInt(value.numero_paginas),
      genero: value.genero.trim() || undefined,
      preco_venda:
        precoVendaFisico ??
        precoVendaDigital ??
        undefined,
      preco_venda_fisico: precoVendaFisico,
      preco_venda_digital: precoVendaDigital,
      canal_venda_digital: value.possui_formato_digital ? value.canal_venda_digital || undefined : undefined,
      url_compra_digital: value.possui_formato_digital ? value.url_compra_digital.trim() || undefined : undefined,
      custo_impressao: value.possui_formato_fisico ? parseOptionalCurrency(value.custo_impressao) : null,
      venda_infinita: value.possui_formato_fisico && !controlarEstoque,
      controlar_estoque: controlarEstoque,
      estoque_disponivel: controlarEstoque ? parseOptionalInt(value.estoque_disponivel) ?? 0 : 0,
      estoque_minimo: controlarEstoque ? parseOptionalInt(value.estoque_minimo) ?? 0 : 0,
      peso_gramas: value.possui_formato_fisico ? parseOptionalInt(value.peso_gramas) : null,
      largura_cm: value.possui_formato_fisico ? parseOptionalDecimal(value.largura_cm) : null,
      altura_cm: value.possui_formato_fisico ? parseOptionalDecimal(value.altura_cm) : null,
      profundidade_cm: value.possui_formato_fisico ? parseOptionalDecimal(value.profundidade_cm) : null,
      data_publicacao_prevista: value.data_publicacao_prevista || undefined,
      data_publicacao: value.data_publicacao || undefined,
      capa: this.coverMeta()?.payload ?? this.editingBook()?.capa ?? null,
      ativo: value.ativo,
    };
  }

  private clearServerErrors(): void {
    this.serverFieldErrors.set({});
    this.coverErrorMessage.set('');
  }

  private watchField<K extends LivroFormField>(field: K): void {
    const subscription = this.form.controls[field].valueChanges.subscribe(() =>
      this.clearServerFieldError(field)
    );
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  private clearServerFieldError(field: LivroFormField): void {
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
    const nextErrors: Partial<Record<LivroFormField, string>> = {};

    if (normalized.includes('titulo do livro')) {
      nextErrors.titulo = 'Informe o título do livro.';
    }
    if (normalized.includes('autor do livro')) {
      nextErrors.autor_id = 'Selecione um autor válido.';
    }
    if (normalized.includes('status do livro')) {
      nextErrors.status = 'Selecione um status válido.';
    }
    if (normalized.includes('formato de venda') || normalized.includes('formato do livro')) {
      nextErrors.possui_formato_fisico = 'Selecione ao menos um formato de venda.';
      nextErrors.possui_formato_digital = 'Selecione ao menos um formato de venda.';
    }
    if (normalized.includes('isbn')) {
      nextErrors.isbn = message;
    }
    if (normalized.includes('codigo_barra')) {
      nextErrors.codigo_barra = message;
    }
    if (normalized.includes('estoque')) {
      nextErrors.estoque_disponivel = message;
      nextErrors.estoque_minimo = message;
    }
    if (normalized.includes('valores do livro')) {
      nextErrors.preco_venda_fisico = message;
      nextErrors.preco_venda_digital = message;
      nextErrors.custo_impressao = message;
    }
    if (normalized.includes('canal de venda digital')) {
      nextErrors.canal_venda_digital = message;
    }
    if (normalized.includes('url de compra digital')) {
      nextErrors.url_compra_digital = message;
    }
    if (normalized.includes('tipo de capa')) {
      nextErrors.tipo_capa = message;
    }
    if (normalized.includes('capa do livro')) {
      this.coverErrorMessage.set(message);
    }

    if (Object.keys(nextErrors).length === 0 && !this.coverErrorMessage()) {
      return false;
    }

    this.serverFieldErrors.set({
      ...this.serverFieldErrors(),
      ...nextErrors,
    });
    return true;
  }
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  return (Number(digits) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumberToCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseOptionalCurrency(value: string): number | null {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalInt(value: string): number | null {
  const digits = onlyDigits(value);
  if (!digits) {
    return null;
  }

  const parsed = Number(digits);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalDecimal(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeDecimalInput(value: string): string {
  const normalized = value.replace(/[^0-9,]/g, '');
  const parts = normalized.split(',');
  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]},${parts.slice(1).join('').slice(0, 2)}`;
}

function resolveBookFormat(possuiFormatoFisico: boolean, possuiFormatoDigital: boolean): string {
  if (possuiFormatoFisico && possuiFormatoDigital) {
    return 'HIBRIDO';
  }

  if (possuiFormatoDigital) {
    return 'DIGITAL';
  }

  return 'FISICO';
}

function applyMarkdownSnippet(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: 'title' | 'subtitle' | 'bold' | 'italic' | 'link' | 'list'
): string {
  const selectedText = value.slice(selectionStart, selectionEnd);
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const safeSelection = selectedText || defaultMarkdownSelection(action);
  const snippet = buildMarkdownSnippet(action, safeSelection);
  return `${before}${snippet}${after}`;
}

function getMarkdownCursorPosition(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: 'title' | 'subtitle' | 'bold' | 'italic' | 'link' | 'list'
): number {
  const selectedText = value.slice(selectionStart, selectionEnd);
  const safeSelection = selectedText || defaultMarkdownSelection(action);
  const snippet = buildMarkdownSnippet(action, safeSelection);

  switch (action) {
    case 'link':
      return selectionStart + snippet.length - 1;
    default:
      return selectionStart + snippet.length;
  }
}

function defaultMarkdownSelection(action: 'title' | 'subtitle' | 'bold' | 'italic' | 'link' | 'list'): string {
  switch (action) {
    case 'title':
      return 'Titulo da secao';
    case 'subtitle':
      return 'Subtitulo';
    case 'bold':
      return 'texto em destaque';
    case 'italic':
      return 'texto em italico';
    case 'link':
      return 'Texto do link';
    case 'list':
      return 'Primeiro item';
  }
}

function buildMarkdownSnippet(
  action: 'title' | 'subtitle' | 'bold' | 'italic' | 'link' | 'list',
  selection: string
): string {
  switch (action) {
    case 'title':
      return `## ${selection}`;
    case 'subtitle':
      return `### ${selection}`;
    case 'bold':
      return `**${selection}**`;
    case 'italic':
      return `*${selection}*`;
    case 'link':
      return `[${selection}](https://)`;
    case 'list':
      return `- ${selection}`;
  }
}
