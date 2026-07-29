import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { PedidoListItem, PedidoStatus, PedidosService } from '../../services/pedidos.service';

type PedidoStatusFilter = 'TODOS' | PedidoStatus;

@Component({
  selector: 'app-pedido-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './pedido-list.page.html',
  styleUrl: './pedido-list.page.css',
})
export class PedidoListPage implements OnInit {
  private readonly pedidosService = inject(PedidosService);
  private searchDebounceId: number | null = null;
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly selectedStatus = signal<PedidoStatusFilter>('TODOS');
  protected readonly pedidos = signal<PedidoListItem[]>([]);
  protected readonly statusFilters: PedidoStatusFilter[] = [
    'TODOS',
    'RASCUNHO',
    'AGUARDANDO_PAGAMENTO',
    'PAGO',
    'EM_SEPARACAO',
    'ENVIADO',
    'ENTREGUE',
    'CANCELADO',
  ];

  protected readonly totalPedidos = computed(() => this.pedidos().length);
  protected readonly totalFaturado = computed(() =>
    this.pedidos().reduce((accumulator, pedido) => accumulator + (pedido.total || 0), 0)
  );
  protected readonly pedidosPagos = computed(
    () => this.pedidos().filter((pedido) => pedido.status === 'PAGO' || pedido.status === 'ENTREGUE').length
  );
  protected readonly resultLabel = computed(() => {
    const total = this.totalPedidos();
    return total === 1 ? '1 pedido encontrado' : `${total} pedidos encontrados`;
  });

  async ngOnInit(): Promise<void> {
    await this.loadPedidos();
  }

  protected updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.scheduleLoadPedidos();
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
    this.scheduleLoadPedidos();
  }

  protected selectStatus(status: PedidoStatusFilter): void {
    this.selectedStatus.set(status);
    void this.loadPedidos();
  }

  protected getStatusCount(status: PedidoStatusFilter): number {
    if (status === 'TODOS') {
      return this.totalPedidos();
    }

    return this.pedidos().filter((pedido) => pedido.status === status).length;
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

  protected statusLabel(status: PedidoStatus): string {
    switch (status) {
      case 'AGUARDANDO_PAGAMENTO':
        return 'Aguardando pagamento';
      case 'EM_SEPARACAO':
        return 'Em separação';
      default:
        return status
          .toLowerCase()
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
    }
  }

  protected statusClass(status: PedidoStatus): string {
    switch (status) {
      case 'PAGO':
      case 'ENTREGUE':
        return 'is-success';
      case 'AGUARDANDO_PAGAMENTO':
      case 'EM_SEPARACAO':
      case 'ENVIADO':
        return 'is-warning';
      case 'CANCELADO':
        return 'is-danger';
      default:
        return 'is-muted';
    }
  }

  protected trackPedido(pedido: PedidoListItem): string {
    return `${pedido.id}-${pedido.codigo}`;
  }

  private async loadPedidos(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const items = await this.pedidosService.list(
        this.searchTerm(),
        this.selectedStatus() === 'TODOS' ? '' : this.selectedStatus()
      );
      this.pedidos.set(items);
    } catch (error) {
      this.errorMessage.set(processApiError(error) || 'Nao foi possivel carregar os pedidos.');
      this.pedidos.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private scheduleLoadPedidos(): void {
    if (this.searchDebounceId !== null) {
      window.clearTimeout(this.searchDebounceId);
    }

    this.searchDebounceId = window.setTimeout(() => {
      void this.loadPedidos();
      this.searchDebounceId = null;
    }, 300);
  }
}
