import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { FormSelectComponent } from '../../../../shared/components/forms/select/form-select.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { ModalComponent } from '../../../../shared/components/feedback/modal/modal.component';
import {
  CmsPostListItem,
  CmsPostsService,
} from '../../services/cms-posts.service';
import {
  CMS_DRAFT_STATUS_OPTIONS,
  getCmsDraftStatusClass,
  getCmsDraftStatusLabel,
  getCmsTypeLabel,
} from '../../utils/cms-post-status';

@Component({
  selector: 'app-cms-post-list-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FormInputComponent,
    FormSelectComponent,
    ButtonComponent,
    ModalComponent,
  ],
  templateUrl: './cms-post-list.page.html',
  styleUrl: './cms-post-list.page.css',
})
export class CmsPostListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cmsPostsService = inject(CmsPostsService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly items = signal<CmsPostListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly confirmModalOpen = signal(false);
  protected readonly confirmModalTitle = signal('');
  protected readonly confirmModalText = signal('');
  protected readonly confirmAction = signal<(() => Promise<void>) | null>(null);

  protected readonly tipo = computed(() => String(this.route.snapshot.data['tipo'] ?? 'BLOG'));
  protected readonly tipoLabel = computed(() => getCmsTypeLabel(this.tipo()));
  protected readonly statusOptions = CMS_DRAFT_STATUS_OPTIONS;

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: [''],
    status: [''],
  });

  protected readonly resultLabel = computed(() => {
    const total = this.total();
    if (total === 0) {
      return 'Nenhum conteúdo encontrado';
    }
    return total === 1 ? '1 conteúdo encontrado' : `${total} conteúdos encontrados`;
  });

  constructor() {
    void this.load(1);
  }

  protected async load(page: number): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const value = this.filterForm.getRawValue();
      const response = await this.cmsPostsService.list({
        tipo: this.tipo(),
        status: value.status,
        q: value.search,
        page,
        page_size: 20,
      });

      this.items.set(response.items || []);
      this.total.set(response.total || 0);
      this.page.set(response.page || page);
      this.totalPages.set(response.total_pages || 1);
    } catch (error) {
      this.items.set([]);
      this.total.set(0);
      this.page.set(1);
      this.totalPages.set(1);
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
    });
    void this.load(1);
  }

  protected getStatusLabel(status: string): string {
    return getCmsDraftStatusLabel(status);
  }

  protected getStatusClass(status: string): string {
    return getCmsDraftStatusClass(status);
  }

  protected async create(): Promise<void> {
    await this.router.navigate(['/painel/cms', this.tipoRouteSegment(), 'novo']);
  }

  protected async goToEdit(id: string): Promise<void> {
    await this.router.navigate(['/painel/cms', this.tipoRouteSegment(), id, 'editar']);
  }

  protected async goToPrevious(): Promise<void> {
    const current = this.page();
    if (current <= 1) {
      return;
    }
    await this.load(current - 1);
  }

  protected async goToNext(): Promise<void> {
    const current = this.page();
    const totalPages = this.totalPages();
    if (current >= totalPages) {
      return;
    }
    await this.load(current + 1);
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

    this.loading.set(true);
    this.errorMessage.set('');
    try {
      await action();
      await this.load(this.page());
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected requestDelete(item: CmsPostListItem): void {
    const title = item.draft_titulo || 'conteúdo';
    this.openConfirmModal(
      'Excluir conteúdo',
      `Essa ação remove "${title}" permanentemente. Esta operação não pode ser desfeita.`,
      async () => {
        await this.cmsPostsService.delete(item.id);
      }
    );
  }

  private tipoRouteSegment(): string {
    switch (this.tipo().toUpperCase()) {
      case 'CONTO':
        return 'contos';
      case 'ARTIGO':
        return 'artigos';
      case 'PAGINA':
        return 'paginas';
      case 'LANDING_PRODUTOS':
        return 'landing-produtos';
      default:
        return 'blog';
    }
  }
}
