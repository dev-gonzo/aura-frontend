import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { EditalDetail, EditaisService } from '../../services/editais.service';
import { getEditalStatusClass, getEditalStatusLabel } from '../../utils/edital-status';

@Component({
  selector: 'app-edital-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './edital-detail.page.html',
  styleUrl: './edital-detail.page.css'
})
export class EditalDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly editaisService = inject(EditaisService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly edital = signal<EditalDetail | null>(null);
  protected readonly coverPreviewUrl = signal<string | null>(null);

  constructor() {
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

  protected formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected formatCurrency(value?: number | null): string {
    if (value == null) {
      return '-';
    }

    if (value === 0) {
      return 'Gratuita';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const id = this.route.snapshot.paramMap.get('id') ?? '';
      const response = await this.editaisService.findById(id);
      this.edital.set(response);
      this.coverPreviewUrl.set(
        response.capa?.base64 ? `data:${response.capa.mime};base64,${response.capa.base64}` : null
      );
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
