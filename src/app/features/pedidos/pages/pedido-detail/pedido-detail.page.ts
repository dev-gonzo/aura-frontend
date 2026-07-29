import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { PedidoDetail, PedidoStatus, PedidosService } from '../../services/pedidos.service';

@Component({
  selector: 'app-pedido-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './pedido-detail.page.html',
  styleUrl: './pedido-detail.page.css',
})
export class PedidoDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pedidosService = inject(PedidosService);
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly pedido = signal<PedidoDetail | null>(null);
  protected readonly addressLabel = computed(() => {
    const entrega = this.pedido()?.entrega;
    if (!entrega) {
      return '';
    }

    return [
      entrega.logradouro,
      entrega.numero,
      entrega.complemento,
      entrega.bairro,
      entrega.cidade,
      entrega.uf,
      entrega.cep,
    ]
      .filter((value) => !!value)
      .join(', ');
  });

  async ngOnInit(): Promise<void> {
    await this.loadPedido();
  }

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value || 0);
  }

  protected formatDate(value?: string | null): string {
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

  private async loadPedido(): Promise<void> {
    const id = (this.route.snapshot.paramMap.get('id') || '').trim();
    if (!id) {
      this.errorMessage.set('Pedido inválido para consulta.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const response = await this.pedidosService.findById(id);
      this.pedido.set(response);
    } catch (error) {
      this.errorMessage.set(processApiError(error) || 'Nao foi possivel carregar o pedido.');
      this.pedido.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
