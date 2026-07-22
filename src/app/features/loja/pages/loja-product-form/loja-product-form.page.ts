import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

import { processApiError } from '../../../../core/utils/process-api-error';
import { AutorListItem, AutoresService } from '../../../autores/services/autores.service';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { ModalComponent } from '../../../../shared/components/feedback/modal/modal.component';
import { FormCheckboxComponent } from '../../../../shared/components/forms/checkbox/form-checkbox.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { MarkdownEditorComponent } from '../../../../shared/components/forms/markdown-editor/markdown-editor.component';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea/form-textarea.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import type { ProcessedImageResult } from '../../../../shared/utils/process-image-file';
import {
  LojaService,
  StoreCategoryPayload,
  StoreCategoryListItem,
  StoreProductAuthorPayload,
  StoreImagePayload,
  StoreProductPhotoPayload,
} from '../../services/loja.service';
import { processStoreProductPhoto } from '../../utils/process-store-product-photo';

type ProductField =
  | 'autores'
  | 'marca'
  | 'editora'
  | 'subtitulo'
  | 'sinopse'
  | 'isbn'
  | 'codigo_barra'
  | 'edicao'
  | 'idioma'
  | 'numero_paginas'
  | 'genero'
  | 'data_publicacao'
  | 'tipo_capa'
  | 'peso_gramas'
  | 'largura_cm'
  | 'altura_cm'
  | 'profundidade_cm'
  | 'slug'
  | 'nome_exibicao'
  | 'descricao_curta'
  | 'preco_venda'
  | 'preco_promocional'
  | 'ordem';

type CategoryField = 'nome' | 'slug' | 'descricao' | 'ordem';

interface EditableProductPhoto {
  id: string;
  order: number;
  is_primary: boolean;
  image: StoreImagePayload;
  previewUrl: string;
}

@Component({
  selector: 'app-loja-product-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    PageHeaderComponent,
    FormInputComponent,
    MarkdownEditorComponent,
    FormTextareaComponent,
    FormCheckboxComponent,
    ModalComponent,
    ButtonComponent,
  ],
  templateUrl: './loja-product-form.page.html',
  styleUrl: './loja-product-form.page.css',
})
export class LojaProductFormPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly autoresService = inject(AutoresService);
  private readonly lojaService = inject(LojaService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly processingPhoto = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly photoErrorMessage = signal('');
  protected readonly galleryModalOpen = signal(false);
  protected readonly categoryModalOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly authors = signal<AutorListItem[]>([]);
  protected readonly categories = signal<StoreCategoryListItem[]>([]);
  protected readonly selectedAuthorsState = signal<string[]>([]);
  protected readonly selectedCategoriesState = signal<string[]>([]);
  protected readonly legacyCategoryLabels = signal<string[]>([]);
  protected readonly legacyAuthorLabels = signal<string[]>([]);
  protected readonly categorySubmitted = signal(false);
  protected readonly categorySaving = signal(false);
  protected readonly categoryDeletingId = signal<string | null>(null);
  protected readonly categorySlugManuallyEdited = signal(false);
  protected readonly categoryEditingId = signal<string | null>(null);
  protected readonly categoryErrorMessage = signal('');
  protected readonly categorySuccessMessage = signal('');
  protected readonly productPhotos = signal<EditableProductPhoto[]>([]);
  protected readonly slugManuallyEdited = signal(false);
  protected readonly authorSearchTerm = signal('');
  protected readonly categorySearchTerm = signal('');
  protected readonly pendingAuthor = signal<string | null>(null);
  protected readonly pendingCategory = signal<string | null>(null);
  protected readonly authorDropdownOpen = signal(false);
  protected readonly categoryDropdownOpen = signal(false);
  protected readonly title = computed(() =>
    this.editingId() ? 'Editar produto da loja' : 'Cadastrar produto da loja'
  );
  protected readonly primaryPhotoPreview = computed(() => {
    const primary = this.productPhotos().find((item) => item.is_primary) ?? this.productPhotos()[0];
    return primary?.previewUrl ?? null;
  });
  protected readonly categoryOptions = computed(() =>
    this.categories().map((item) => ({
      value: item.nome,
      label: item.ativa ? item.nome : `${item.nome} (inativa)`,
      active: item.ativa,
    }))
  );
  protected readonly selectedCategoryLabels = computed(() => this.selectedCategoriesState());
  protected readonly authorOptions = computed(() =>
    this.authors().map((item) => ({
      nome: item.nome_exibicao.trim(),
      active: item.status === 'ATIVO',
    }))
  );
  protected readonly filteredAuthorOptions = computed(() => {
    const search = this.authorSearchTerm().trim().toLowerCase();
    const selected = new Set(this.selectedAuthorsState().map((item) => item.trim().toLowerCase()));
    return this.authorOptions().filter((item) => {
      const normalizedName = item.nome.toLowerCase();
      if (selected.has(normalizedName)) {
        return false;
      }
      return !search || normalizedName.includes(search);
    });
  });
  protected readonly selectedAuthorLabels = computed(() => this.selectedAuthorsState());
  protected readonly filteredCategoryOptions = computed(() => {
    const search = this.categorySearchTerm().trim().toLowerCase();
    const selected = new Set(this.selectedCategoriesState().map((item) => item.trim().toLowerCase()));
    return this.categoryOptions().filter((item) => {
      const normalizedLabel = item.label.toLowerCase();
      const normalizedValue = item.value.toLowerCase();
      if (selected.has(normalizedValue)) {
        return false;
      }
      return !search || normalizedLabel.includes(search) || normalizedValue.includes(search);
    });
  });
  protected readonly photoCountLabel = computed(() => `${this.productPhotos().length}/5 fotos`);
  protected readonly canAddMorePhotos = computed(() => this.productPhotos().length < 5);
  protected readonly categoryModalTitle = computed(() =>
    this.categoryEditingId() ? 'Editar categoria' : 'Gerenciar categorias'
  );
  protected readonly activeCategoryCount = computed(() => this.categories().filter((item) => item.ativa).length);
  protected readonly form = this.formBuilder.nonNullable.group({
    livro_id: [''],
    is_book: [true],
    autores: [[] as string[]],
    marca: [''],
    editora: [''],
    subtitulo: [''],
    sinopse: [''],
    isbn: [''],
    codigo_barra: [''],
    edicao: [''],
    idioma: ['Português'],
    numero_paginas: [''],
    genero: [''],
    data_publicacao: [''],
    tipo_capa: ['Brochura'],
    peso_gramas: [''],
    largura_cm: [''],
    altura_cm: [''],
    profundidade_cm: [''],
    slug: ['', Validators.required],
    nome_exibicao: ['', Validators.required],
    descricao_curta: [''],
    categorias: [[] as string[]],
    preco_venda: ['0,00', Validators.required],
    em_promocao: [false],
    preco_promocional: ['0,00'],
    destaque: [false],
    lancamento: [false],
    ativo: [true],
    ordem: ['0', Validators.required],
  });
  protected readonly categoryForm = this.formBuilder.nonNullable.group({
    nome: ['', Validators.required],
    slug: [''],
    descricao: [''],
    ordem: ['0', Validators.required],
    ativa: [true],
  });

  constructor() {
    this.watchNameChanges();
    this.watchPromotionChanges();
    this.watchCategoryNameChanges();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.handleRoute(params.get('id'));
    });
  }

  protected hasFieldError(field: ProductField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected getFieldError(field: ProductField): string {
    const control = this.form.controls[field];
    if (!control.invalid || (!control.touched && !this.submitted())) {
      return '';
    }

    if (control.errors?.['required']) {
      switch (field) {
        case 'slug':
          return 'Informe o slug público do produto.';
        case 'autores':
          return 'Selecione ao menos um autor.';
        case 'editora':
          return 'Informe a editora do livro.';
        case 'nome_exibicao':
          return 'Informe o nome exibido na loja.';
        case 'preco_venda':
          return 'Informe o preço de venda da loja.';
        case 'preco_promocional':
          return 'Informe o preço promocional.';
        case 'ordem':
          return 'Informe a ordem de exibição.';
        default:
          return 'Preencha este campo.';
      }
    }

    return '';
  }

  protected handleSlugInput(): void {
    this.slugManuallyEdited.set(true);
  }

  protected formatPriceInput(event: Event): void {
    this.writePriceInput('preco_venda', event);
  }

  protected formatPromotionalPriceInput(event: Event): void {
    this.writePriceInput('preco_promocional', event);
  }

  protected normalizeBookIdentifierInput(field: 'isbn' | 'codigo_barra', event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 13);
    this.form.controls[field].setValue(digits);
  }

  protected normalizeBookIntegerInput(field: 'numero_paginas' | 'peso_gramas', event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    this.form.controls[field].setValue(digits);
  }

  protected normalizeBookDecimalInput(
    field: 'largura_cm' | 'altura_cm' | 'profundidade_cm',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const normalized = normalizeDecimalInput(input.value);
    this.form.controls[field].setValue(normalized);
  }

  protected async handlePhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (!this.canAddMorePhotos()) {
      this.photoErrorMessage.set('Você pode cadastrar no máximo 5 fotos por produto.');
      return;
    }

    this.processingPhoto.set(true);
    this.photoErrorMessage.set('');

    try {
      const processed = await processStoreProductPhoto(file);
      this.productPhotos.update((items) => normalizeEditablePhotos([...items, createEditablePhoto(processed, items.length === 0)]));
    } catch (error) {
      this.photoErrorMessage.set(processApiError(error));
    } finally {
      this.processingPhoto.set(false);
    }
  }

  protected openGalleryModal(): void {
    this.galleryModalOpen.set(true);
  }

  protected closeGalleryModal(): void {
    this.galleryModalOpen.set(false);
  }

  protected reorderPhotos(event: CdkDragDrop<EditableProductPhoto[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.productPhotos.update((items) => {
      const next = [...items];
      moveItemInArray(next, event.previousIndex, event.currentIndex);
      return normalizeEditablePhotos(next);
    });
  }

  protected reorderAuthors(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const next = [...this.selectedAuthorsState()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.form.controls.autores.setValue(next);
    this.selectedAuthorsState.set(next);
    this.syncLegacyAuthors(next);
  }

  protected setPrimaryPhoto(index: number): void {
    this.productPhotos.update((items) =>
      normalizeEditablePhotos(items.map((item, currentIndex) => ({ ...item, is_primary: currentIndex === index })))
    );
  }

  protected removePhoto(index: number): void {
    this.productPhotos.update((items) => normalizeEditablePhotos(items.filter((_, currentIndex) => currentIndex !== index)));
  }

  protected hasPromotionalPriceError(): boolean {
    const control = this.form.controls.preco_promocional;
    return this.form.controls.em_promocao.value && (control.touched || this.submitted()) && parseDecimal(control.value) <= 0;
  }

  protected promotionalPriceErrorText(): string {
    if (!this.hasPromotionalPriceError()) {
      return '';
    }
    return 'Informe um preço promocional maior que zero.';
  }

  protected handlePromotionToggle(): void {
    const enabled = this.form.controls.em_promocao.value;
    if (enabled) {
      this.form.controls.preco_promocional.enable({ emitEvent: false });
      if (parseDecimal(this.form.controls.preco_promocional.value) <= 0) {
        this.form.controls.preco_promocional.setValue(this.form.controls.preco_venda.value || '0,00', {
          emitEvent: false,
        });
      }
      return;
    }

    this.form.controls.preco_promocional.setValue('0,00', { emitEvent: false });
    this.form.controls.preco_promocional.disable({ emitEvent: false });
  }

  protected async openCategoryModal(): Promise<void> {
    this.categoryModalOpen.set(true);
    this.categoryErrorMessage.set('');
    this.categorySuccessMessage.set('');
    await this.loadCategories();
  }

  protected closeCategoryModal(): void {
    this.categoryModalOpen.set(false);
    this.resetCategoryForm();
  }

  protected hasCategoryFieldError(field: CategoryField): boolean {
    const control = this.categoryForm.controls[field];
    return control.invalid && (control.touched || this.categorySubmitted());
  }

  protected getCategoryFieldError(field: CategoryField): string {
    const control = this.categoryForm.controls[field];
    if (!control.invalid || (!control.touched && !this.categorySubmitted())) {
      return '';
    }

    if (control.errors?.['required']) {
      switch (field) {
        case 'nome':
          return 'Informe o nome da categoria.';
        case 'ordem':
          return 'Informe a ordem da categoria.';
        default:
          return 'Preencha este campo.';
      }
    }

    return '';
  }

  protected handleCategorySlugInput(): void {
    this.categorySlugManuallyEdited.set(true);
  }

  protected editCategory(item: StoreCategoryListItem): void {
    this.categoryEditingId.set(item.id);
    this.categorySlugManuallyEdited.set(true);
    this.categoryErrorMessage.set('');
    this.categorySuccessMessage.set('');
    this.categoryForm.reset({
      nome: item.nome,
      slug: item.slug,
      descricao: item.descricao || '',
      ordem: String(item.ordem),
      ativa: item.ativa,
    });
    this.categoryForm.markAsPristine();
    this.categoryForm.markAsUntouched();
    this.categorySubmitted.set(false);
  }

  protected cancelCategoryEdit(): void {
    this.resetCategoryForm();
  }

  protected async submitCategory(): Promise<void> {
    this.categorySubmitted.set(true);
    this.categoryErrorMessage.set('');
    this.categorySuccessMessage.set('');

    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.categorySaving.set(true);

    const value = this.categoryForm.getRawValue();
    const payload: StoreCategoryPayload = {
      nome: value.nome.trim(),
      slug: normalizeSlug(value.slug) || normalizeSlug(value.nome),
      descricao: value.descricao.trim(),
      ordem: parseInteger(value.ordem),
      ativa: value.ativa,
    };
    const selectedCategories = this.form.controls.categorias.value;
    const currentEditingItem = this.categories().find((item) => item.id === this.categoryEditingId());
    const previousName = currentEditingItem?.nome?.trim() || '';

    try {
      if (this.categoryEditingId()) {
        await this.lojaService.updateCategory(this.categoryEditingId()!, payload);
        this.categorySuccessMessage.set('Categoria atualizada com sucesso.');
      } else {
        await this.lojaService.createCategory(payload);
        this.categorySuccessMessage.set('Categoria criada com sucesso.');
      }

      await this.loadCategories();
      this.syncLegacyCategories(this.form.controls.categorias.value);

      if (!this.categoryEditingId()) {
        this.form.controls.categorias.setValue(addCategorySelection(selectedCategories, payload.nome));
      } else if (selectedCategories.some((item) => item.trim() === previousName)) {
        this.form.controls.categorias.setValue(
          selectedCategories.map((item) => (item.trim() === previousName ? payload.nome : item))
        );
      }

      this.resetCategoryForm();
    } catch (error) {
      this.categoryErrorMessage.set(processApiError(error));
    } finally {
      this.categorySaving.set(false);
    }
  }

  protected async deleteCategory(item: StoreCategoryListItem): Promise<void> {
    const confirmed = globalThis.confirm(
      `Excluir a categoria "${item.nome}"? Os produtos vinculados ficarão sem categoria.`
    );
    if (!confirmed) {
      return;
    }

    this.categoryDeletingId.set(item.id);
    this.categoryErrorMessage.set('');
    this.categorySuccessMessage.set('');

    try {
      await this.lojaService.deleteCategory(item.id);
      if (this.form.controls.categorias.value.some((category) => category.trim() === item.nome.trim())) {
        this.form.controls.categorias.setValue(
          this.form.controls.categorias.value.filter((category) => category.trim() !== item.nome.trim())
        );
        this.syncLegacyCategories(this.form.controls.categorias.value);
      }
      await this.loadCategories();
      this.categorySuccessMessage.set('Categoria excluída com sucesso.');

      if (this.categoryEditingId() === item.id) {
        this.resetCategoryForm();
      }
    } catch (error) {
      this.categoryErrorMessage.set(processApiError(error));
    } finally {
      this.categoryDeletingId.set(null);
    }
  }

  protected isDeletingCategory(id: string): boolean {
    return this.categoryDeletingId() === id;
  }

  private writePriceInput(field: 'preco_venda' | 'preco_promocional', event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const cents = digits ? Number(digits) / 100 : 0;
    this.form.controls[field].setValue(cents.toFixed(2).replace('.', ','));
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.form.controls.is_book.value && this.form.controls.autores.value.length === 0) {
      this.errorMessage.set('Selecione ao menos um autor para livros.');
      return;
    }
    if (this.form.controls.is_book.value && !this.form.controls.editora.value.trim()) {
      this.errorMessage.set('Informe a editora do livro.');
      return;
    }

    this.saving.set(true);

    try {
      const value = this.form.getRawValue();
      const authors = (value.is_book ? value.autores : [])
        .map((name) => this.mapAuthorNameToPayload(name))
        .filter((item): item is StoreProductAuthorPayload => !!item);
      const payload = {
        livro_id: value.livro_id.trim() || undefined,
        is_book: value.is_book,
        authors,
        autor_nome: authors.map((item) => item.nome).join(', ') || undefined,
        marca: value.marca.trim(),
        editora: value.is_book ? value.editora.trim() : '',
        subtitulo: value.is_book ? value.subtitulo.trim() : '',
        sinopse: value.is_book ? value.sinopse.trim() : '',
        isbn: value.is_book ? value.isbn.trim() : '',
        codigo_barra: value.is_book ? value.codigo_barra.trim() : '',
        edicao: value.is_book ? value.edicao.trim() : '',
        idioma: value.is_book ? value.idioma.trim() : '',
        numero_paginas: value.is_book ? parseOptionalInteger(value.numero_paginas) : null,
        genero: value.is_book ? value.genero.trim() : '',
        data_publicacao: value.is_book ? value.data_publicacao : '',
        tipo_capa: value.is_book ? value.tipo_capa.trim() : '',
        peso_gramas: value.is_book ? parseOptionalInteger(value.peso_gramas) : null,
        largura_cm: value.is_book ? parseOptionalDecimal(value.largura_cm) : null,
        altura_cm: value.is_book ? parseOptionalDecimal(value.altura_cm) : null,
        profundidade_cm: value.is_book ? parseOptionalDecimal(value.profundidade_cm) : null,
        slug: normalizeSlug(value.slug),
        nome_exibicao: value.nome_exibicao.trim(),
        descricao_curta: value.descricao_curta.trim(),
        categorias: value.categorias,
        preco_venda: parseDecimal(value.preco_venda),
        em_promocao: value.em_promocao,
        preco_promocional: value.em_promocao ? parseDecimal(value.preco_promocional) : 0,
        destaque: value.destaque,
        lancamento: value.lancamento,
        ativo: value.ativo,
        ordem: parseInteger(value.ordem),
        fotos: this.productPhotos().map((item, index) => ({
          id: item.id,
          order: index,
          is_primary: item.is_primary,
          image: item.image,
        })),
      };

      if (this.editingId()) {
        await this.lojaService.updateProduct(this.editingId()!, payload);
        this.successMessage.set('Produto da loja atualizado com sucesso.');
      } else {
        await this.lojaService.createProduct(payload);
        this.successMessage.set('Produto da loja criado com sucesso.');
      }

      await this.router.navigate(['/loja/produtos']);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async handleRoute(id: string | null): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.photoErrorMessage.set('');
    this.editingId.set(id);

    try {
      await this.loadAuthors();
      await this.loadCategories();

      if (id) {
        const item = await this.lojaService.findProductById(id);
        const selectedCategories = item.categorias?.length ? item.categorias : item.categoria ? [item.categoria] : [];
        const selectedAuthors =
          (
            item.authors?.map((author) => author.nome.trim()).filter((author): author is string => !!author) ??
            []
          ).length
            ? (item.authors?.map((author) => author.nome.trim()).filter((author): author is string => !!author) ?? [])
            : item.autor_nome
              ? item.autor_nome
                  .split(',')
                  .map((author) => author.trim())
                  .filter((author): author is string => !!author)
              : [];
        this.slugManuallyEdited.set(true);
        this.syncLegacyCategories(selectedCategories);
        this.syncLegacyAuthors(selectedAuthors);
        this.selectedCategoriesState.set(selectedCategories);
        this.selectedAuthorsState.set(selectedAuthors);
        this.form.reset({
          livro_id: item.livro_id ?? '',
          is_book: item.is_book ?? true,
          autores: selectedAuthors,
          marca: item.marca ?? '',
          editora: item.editora ?? '',
          subtitulo: item.subtitulo ?? item.livro_subtitulo ?? '',
          sinopse: item.sinopse ?? '',
          isbn: item.isbn ?? '',
          codigo_barra: item.codigo_barra ?? '',
          edicao: item.edicao ?? '',
          idioma: item.idioma ?? 'Português',
          numero_paginas: item.numero_paginas != null ? String(item.numero_paginas) : '',
          genero: item.genero ?? '',
          data_publicacao: item.data_publicacao ?? '',
          tipo_capa: item.tipo_capa ?? 'Brochura',
          peso_gramas: item.peso_gramas != null ? String(item.peso_gramas) : '',
          largura_cm: item.largura_cm != null ? formatDecimalInput(item.largura_cm) : '',
          altura_cm: item.altura_cm != null ? formatDecimalInput(item.altura_cm) : '',
          profundidade_cm: item.profundidade_cm != null ? formatDecimalInput(item.profundidade_cm) : '',
          slug: item.slug,
          nome_exibicao: item.nome_exibicao,
          descricao_curta: item.descricao_curta ?? '',
          categorias: selectedCategories,
          preco_venda: toCurrencyInput(item.preco_venda),
          em_promocao: item.em_promocao,
          preco_promocional: toCurrencyInput(item.preco_promocional),
          destaque: item.destaque,
          lancamento: item.lancamento,
          ativo: item.ativo,
          ordem: String(item.ordem),
        });
        this.productPhotos.set(mapEditablePhotos(item.fotos));
      } else {
        this.slugManuallyEdited.set(false);
        this.legacyCategoryLabels.set([]);
        this.legacyAuthorLabels.set([]);
        this.selectedCategoriesState.set([]);
        this.selectedAuthorsState.set([]);
        this.productPhotos.set([]);
        this.form.reset({
          livro_id: '',
          is_book: true,
          autores: [],
          marca: '',
          editora: '',
          subtitulo: '',
          sinopse: '',
          isbn: '',
          codigo_barra: '',
          edicao: '',
          idioma: 'Português',
          numero_paginas: '',
          genero: '',
          data_publicacao: '',
          tipo_capa: 'Brochura',
          peso_gramas: '',
          largura_cm: '',
          altura_cm: '',
          profundidade_cm: '',
          slug: '',
          nome_exibicao: '',
          descricao_curta: '',
          categorias: [],
          preco_venda: '0,00',
          em_promocao: false,
          preco_promocional: '0,00',
          destaque: false,
          lancamento: false,
          ativo: true,
          ordem: '0',
        });
      }

      this.handlePromotionToggle();

      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.submitted.set(false);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAuthors(): Promise<void> {
    this.authors.set(await this.autoresService.list('', 'ATIVO'));
  }

  private async loadCategories(): Promise<void> {
    this.categories.set(await this.lojaService.listCategories());
  }

  protected isCategorySelected(name: string): boolean {
    return this.selectedCategoriesState().includes(name);
  }

  protected isAuthorSelected(name: string): boolean {
    return this.selectedAuthorsState().includes(name);
  }

  protected openAuthorDropdown(): void {
    this.authorDropdownOpen.set(true);
  }

  protected openCategoryDropdown(): void {
    this.categoryDropdownOpen.set(true);
  }

  protected closeAuthorDropdown(): void {
    queueMicrotask(() => this.authorDropdownOpen.set(false));
  }

  protected closeCategoryDropdown(): void {
    queueMicrotask(() => this.categoryDropdownOpen.set(false));
  }

  protected handleAuthorSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.authorSearchTerm.set(value);
    this.pendingAuthor.set(null);
    this.authorDropdownOpen.set(true);
  }

  protected handleCategorySearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.categorySearchTerm.set(value);
    this.pendingCategory.set(null);
    this.categoryDropdownOpen.set(true);
  }

  protected selectAuthorOption(event: MouseEvent, name: string): void {
    event.preventDefault();
    this.pendingAuthor.set(name);
    this.authorSearchTerm.set(name);
    this.authorDropdownOpen.set(false);
  }

  protected selectCategoryOption(event: MouseEvent, name: string): void {
    event.preventDefault();
    this.pendingCategory.set(name);
    this.categorySearchTerm.set(name);
    this.categoryDropdownOpen.set(false);
  }

  protected addPendingAuthor(): void {
    const selected = this.pendingAuthor() || this.authorSearchTerm().trim();
    if (!selected || this.isAuthorSelected(selected)) {
      return;
    }
    const next = [...this.selectedAuthorsState(), selected];
    this.form.controls.autores.setValue(next);
    this.selectedAuthorsState.set(next);
    this.syncLegacyAuthors(next);
    this.pendingAuthor.set(null);
    this.authorSearchTerm.set('');
  }

  protected addPendingCategory(): void {
    const selected = this.pendingCategory() || this.categorySearchTerm().trim();
    if (!selected || this.isCategorySelected(selected)) {
      return;
    }
    const next = [...this.selectedCategoriesState(), selected];
    this.form.controls.categorias.setValue(next);
    this.selectedCategoriesState.set(next);
    this.syncLegacyCategories(next);
    this.pendingCategory.set(null);
    this.categorySearchTerm.set('');
  }

  protected canAddPendingAuthor(): boolean {
    const selected = this.pendingAuthor() || this.authorSearchTerm().trim();
    return !!selected && !this.isAuthorSelected(selected);
  }

  protected canAddPendingCategory(): boolean {
    const selected = this.pendingCategory() || this.categorySearchTerm().trim();
    return !!selected && !this.isCategorySelected(selected);
  }

  protected toggleCategorySelection(name: string): void {
    const current = this.selectedCategoriesState();
    if (current.includes(name)) {
      const next = current.filter((item) => item !== name);
      this.form.controls.categorias.setValue(next);
      this.selectedCategoriesState.set(next);
      this.syncLegacyCategories(next);
      return;
    }
    const next = [...current, name];
    this.form.controls.categorias.setValue(next);
    this.selectedCategoriesState.set(next);
    this.syncLegacyCategories(next);
  }

  protected toggleAuthorSelection(name: string): void {
    const current = this.selectedAuthorsState();
    if (current.includes(name)) {
      const next = current.filter((item) => item !== name);
      this.form.controls.autores.setValue(next);
      this.selectedAuthorsState.set(next);
      this.syncLegacyAuthors(next);
      return;
    }
    const next = [...current, name];
    this.form.controls.autores.setValue(next);
    this.selectedAuthorsState.set(next);
    this.syncLegacyAuthors(next);
  }

  protected hasAuthorSelectionError(): boolean {
    return this.form.controls.is_book.value && this.submitted() && this.form.controls.autores.value.length === 0;
  }

  protected hasPublisherSelectionError(): boolean {
    return this.form.controls.is_book.value && this.submitted() && !this.form.controls.editora.value.trim();
  }

  private syncLegacyCategories(values: string[]): void {
    const existingCategories = new Set(this.categories().map((item) => item.nome.trim().toLowerCase()));
    this.legacyCategoryLabels.set(
      values
        .map((item) => item.trim())
        .filter((item) => item && !existingCategories.has(item.toLowerCase()))
    );
  }

  private syncLegacyAuthors(values: string[]): void {
    const existingAuthors = new Set(this.authors().map((item) => item.nome_exibicao.trim().toLowerCase()));
    this.legacyAuthorLabels.set(
      values
        .map((item) => item.trim())
        .filter((item) => item && !existingAuthors.has(item.toLowerCase()))
    );
  }

  private watchNameChanges(): void {
    this.form.controls.nome_exibicao.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (this.slugManuallyEdited()) {
          return;
        }

        this.form.controls.slug.setValue(normalizeSlug(value), { emitEvent: false });
      });
  }

  private watchPromotionChanges(): void {
    this.form.controls.em_promocao.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.handlePromotionToggle());
  }

  private mapAuthorNameToPayload(name: string): StoreProductAuthorPayload | null {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return null;
    }

    const selectedAuthor = this.authors().find((item) => item.nome_exibicao.trim().toLowerCase() === trimmedName.toLowerCase());
    if (!selectedAuthor) {
      return { nome: trimmedName };
    }

    return {
      id: selectedAuthor.id,
      nome: selectedAuthor.nome_exibicao.trim(),
    };
  }

  private resetCategoryForm(): void {
    this.categoryEditingId.set(null);
    this.categorySlugManuallyEdited.set(false);
    this.categoryForm.reset({
      nome: '',
      slug: '',
      descricao: '',
      ordem: '0',
      ativa: true,
    });
    this.categoryForm.markAsPristine();
    this.categoryForm.markAsUntouched();
    this.categorySubmitted.set(false);
  }

  private watchCategoryNameChanges(): void {
    this.categoryForm.controls.nome.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (this.categorySlugManuallyEdited()) {
          return;
        }

        this.categoryForm.controls.slug.setValue(normalizeSlug(value), { emitEvent: false });
      });
  }
}

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseDecimal(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalInteger(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalDecimal(value: string): number | null {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeDecimalInput(value: string): string {
  const normalized = value
    .replace(/[^\d,.\s]/g, '')
    .replace(/\./g, ',')
    .replace(/\s+/g, '')
    .replace(/,+/g, ',');
  const parts = normalized.split(',');
  if (parts.length <= 1) {
    return normalized;
  }
  return `${parts[0]},${parts.slice(1).join('').slice(0, 2)}`;
}

function formatDecimalInput(value: number): string {
  return String(value).replace('.', ',');
}

function toCurrencyInput(value: number): string {
  return (value || 0).toFixed(2).replace('.', ',');
}

function createEditablePhoto(processed: ProcessedImageResult, isPrimary: boolean): EditableProductPhoto {
  const image: StoreImagePayload = processed.payload;

  return {
    id: processed.payload.hash_sha256 || `foto-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    order: 0,
    is_primary: isPrimary,
    image,
    previewUrl: processed.previewUrl,
  };
}

function mapEditablePhotos(items?: StoreProductPhotoPayload[] | null): EditableProductPhoto[] {
  if (!items?.length) {
    return [];
  }

  return normalizeEditablePhotos(
    items
      .filter((item) => item.image?.base64 && item.image?.mime)
      .map((item, index) => ({
        id: item.id || item.image?.hash_sha256 || `foto-${index + 1}`,
        order: item.order ?? index,
        is_primary: !!item.is_primary,
        image: item.image as StoreImagePayload,
        previewUrl: `data:${item.image!.mime};base64,${item.image!.base64}`,
      }))
  );
}

function normalizeEditablePhotos(items: EditableProductPhoto[]): EditableProductPhoto[] {
  const limited = items.slice(0, 5);
  if (!limited.length) {
    return [];
  }

  let primaryIndex = limited.findIndex((item) => item.is_primary);
  if (primaryIndex < 0) {
    primaryIndex = 0;
  }

  return limited.map((item, index) => ({
    ...item,
    order: index,
    is_primary: index === primaryIndex,
  }));
}

function addCategorySelection(current: string[], category: string): string[] {
  const trimmed = category.trim();
  if (!trimmed) {
    return current;
  }

  if (current.some((item) => item.trim() === trimmed)) {
    return current;
  }

  return [...current, trimmed];
}
