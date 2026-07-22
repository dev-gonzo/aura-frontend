import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { ModalComponent } from '../../../../shared/components/feedback/modal/modal.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea/form-textarea.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { LojaService, StoreCategoryListItem } from '../../services/loja.service';

type CategoryField = 'nome' | 'slug' | 'descricao' | 'ordem';

@Component({
  selector: 'app-loja-categories-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormInputComponent,
    FormTextareaComponent,
    ModalComponent,
    ButtonComponent,
  ],
  templateUrl: './loja-categories.page.html',
  styleUrl: './loja-categories.page.css',
})
export class LojaCategoriesPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly lojaService = inject(LojaService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly modalOpen = signal(false);
  protected readonly submitted = signal(false);
  protected readonly slugManuallyEdited = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly items = signal<StoreCategoryListItem[]>([]);
  protected readonly title = computed(() => 'Gerenciar categorias da loja');
  protected readonly modalTitle = computed(() =>
    this.editingId() ? 'Editar categoria' : 'Nova categoria'
  );
  protected readonly activeCount = computed(() => this.items().filter((item) => item.ativa).length);
  protected readonly totalLinkedProducts = computed(() =>
    this.items().reduce((total, item) => total + (item.produtos_count || 0), 0)
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', Validators.required],
    slug: [''],
    descricao: [''],
    ordem: ['0', Validators.required],
    ativa: [true],
  });

  constructor() {
    this.watchNameChanges();
    void this.load();
  }

  protected hasFieldError(field: CategoryField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected getFieldError(field: CategoryField): string {
    const control = this.form.controls[field];
    if (!control.invalid || (!control.touched && !this.submitted())) {
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

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      this.items.set(await this.lojaService.listCategories());
    } catch (error) {
      this.items.set([]);
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected handleSlugInput(): void {
    this.slugManuallyEdited.set(true);
  }

  protected openCreateModal(): void {
    this.resetForm();
    this.errorMessage.set('');
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
    this.resetForm();
    this.errorMessage.set('');
  }

  protected editCategory(item: StoreCategoryListItem): void {
    this.modalOpen.set(true);
    this.editingId.set(item.id);
    this.slugManuallyEdited.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.form.reset({
      nome: item.nome,
      slug: item.slug,
      descricao: item.descricao || '',
      ordem: String(item.ordem),
      ativa: item.ativa,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitted.set(false);
  }

  protected cancelEdit(): void {
    this.closeModal();
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    try {
      const value = this.form.getRawValue();
      const payload = {
        nome: value.nome.trim(),
        slug: normalizeSlug(value.slug) || normalizeSlug(value.nome),
        descricao: value.descricao.trim(),
        ordem: parseInteger(value.ordem),
        ativa: value.ativa,
      };

      if (this.editingId()) {
        await this.lojaService.updateCategory(this.editingId()!, payload);
        this.successMessage.set('Categoria atualizada com sucesso.');
      } else {
        await this.lojaService.createCategory(payload);
        this.successMessage.set('Categoria criada com sucesso.');
      }

      await this.load();
      this.closeModal();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteCategory(item: StoreCategoryListItem): Promise<void> {
    const confirmed = globalThis.confirm(
      `Excluir a categoria "${item.nome}"? Os produtos vinculados ficarão sem categoria.`
    );
    if (!confirmed) {
      return;
    }

    this.deletingId.set(item.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.lojaService.deleteCategory(item.id);
      this.successMessage.set('Categoria excluída com sucesso.');
      await this.load();

      if (this.editingId() === item.id) {
        this.closeModal();
      }
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.deletingId.set(null);
    }
  }

  protected isDeleting(id: string): boolean {
    return this.deletingId() === id;
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.slugManuallyEdited.set(false);
    this.form.reset({
      nome: '',
      slug: '',
      descricao: '',
      ordem: '0',
      ativa: true,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.submitted.set(false);
  }

  private watchNameChanges(): void {
    this.form.controls.nome.valueChanges.subscribe((value) => {
      if (this.slugManuallyEdited()) {
        return;
      }

      this.form.controls.slug.setValue(normalizeSlug(value), { emitEvent: false });
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

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
