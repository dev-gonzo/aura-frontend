import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { ModalComponent } from '../../../../shared/components/feedback/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import {
  AbandonedCartDetail,
  AbandonedCartListItem,
  AbandonedCartsService,
} from '../../services/abandoned-carts.service';

type CartItemSnapshot = {
  nome_exibicao?: string;
};

type CartItem = {
  quantidade?: number;
  snapshot?: CartItemSnapshot;
};

@Component({
  selector: 'app-loja-abandoned-carts-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, ModalComponent, ButtonComponent],
  templateUrl: './loja-abandoned-carts.page.html',
  styleUrl: './loja-abandoned-carts.page.css',
})
export class LojaAbandonedCartsPage implements OnInit {
  private readonly cartsService = inject(AbandonedCartsService);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly carts = signal<AbandonedCartListItem[]>([]);

  protected readonly detailModalOpen = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly detailErrorMessage = signal('');
  protected readonly selectedCart = signal<AbandonedCartDetail | null>(null);

  protected readonly totalCarts = computed(() => this.carts().length);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async reload(): Promise<void> {
    await this.load();
  }

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value || 0);
  }

  protected formatDate(value: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('pt-BR');
  }

  protected openDetail(cart: AbandonedCartListItem): void {
    void this.loadDetail(cart.id);
  }

  protected closeDetail(): void {
    this.detailModalOpen.set(false);
    this.detailErrorMessage.set('');
    this.selectedCart.set(null);
  }

  protected itemLabel(item: unknown): string {
    const cast = item as CartItem;
    const name = cast?.snapshot?.nome_exibicao?.trim();
    return name || 'Item do carrinho';
  }

  protected itemQuantity(item: unknown): number {
    const cast = item as CartItem;
    return Math.max(1, Math.floor(cast?.quantidade || 1));
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const items = await this.cartsService.list();
      this.carts.set(items);
    } catch (error) {
      this.errorMessage.set(processApiError(error) || 'Nao foi possivel carregar os carrinhos abandonados.');
      this.carts.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDetail(id: string): Promise<void> {
    this.detailModalOpen.set(true);
    this.detailLoading.set(true);
    this.detailErrorMessage.set('');
    this.selectedCart.set(null);

    try {
      const detail = await this.cartsService.get(id);
      this.selectedCart.set(detail);
    } catch (error) {
      this.detailErrorMessage.set(processApiError(error) || 'Nao foi possivel carregar o carrinho agora.');
      this.selectedCart.set(null);
    } finally {
      this.detailLoading.set(false);
    }
  }
}

