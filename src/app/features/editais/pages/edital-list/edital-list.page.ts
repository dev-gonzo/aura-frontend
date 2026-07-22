import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { FormSelectComponent } from '../../../../shared/components/forms/select/form-select.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { EditalListItem, EditaisService } from '../../services/editais.service';
import {
  EDITAL_STATUS_OPTIONS,
  getEditalStatusClass,
  getEditalStatusLabel,
} from '../../utils/edital-status';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-edital-list-page',
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
  templateUrl: './edital-list.page.html',
  styleUrl: './edital-list.page.css'
})
export class EditalListPage {
  private readonly editaisService = inject(EditaisService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly items = signal<EditalListItem[]>([]);
  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    status: [''],
  });
  protected readonly statusOptions = EDITAL_STATUS_OPTIONS;
  protected readonly resultLabel = computed(() => {
    const total = this.items().length;
    return total === 1 ? '1 edital encontrado' : `${total} editais encontrados`;
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const value = this.filterForm.getRawValue();
      this.items.set(await this.editaisService.list(value.search, value.status));
    } catch (error) {
      this.errorMessage.set(processApiError(error));
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
    });
    void this.load();
  }

  protected getStatusLabel(status: string): string {
    return getEditalStatusLabel(status);
  }

  protected getStatusClass(status: string): string {
    return getEditalStatusClass(status);
  }

  protected formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`));
  }
}
