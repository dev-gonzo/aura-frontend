import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { FormSelectComponent, FormSelectOption } from '../../../../shared/components/forms/select/form-select.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { AutorListItem, AutoresService } from '../../services/autores.service';

@Component({
  selector: 'app-autor-list-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormInputComponent,
    FormSelectComponent,
    ButtonComponent,
  ],
  templateUrl: './autor-list.page.html',
  styleUrl: './autor-list.page.css'
})
export class AutorListPage {
  private readonly autoresService = inject(AutoresService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly items = signal<AutorListItem[]>([]);
  protected readonly statusOptions: FormSelectOption[] = [
    { value: 'ATIVO', label: 'Ativo' },
    { value: 'INATIVO', label: 'Inativo' },
  ];
  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    status: [''],
  });
  protected readonly resultLabel = computed(() => {
    const total = this.items().length;
    return total === 1 ? '1 autor encontrado' : `${total} autores encontrados`;
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      const value = this.filterForm.getRawValue();
      this.items.set(await this.autoresService.list(value.search, value.status));
    } catch (error) {
      this.errorMessage.set(processApiError(error));
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  protected clearFilters(): void {
    this.filterForm.reset({ search: '', status: '' });
    void this.load();
  }
}
