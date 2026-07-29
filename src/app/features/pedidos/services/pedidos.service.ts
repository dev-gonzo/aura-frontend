import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export type PedidoStatus =
  | 'RASCUNHO'
  | 'AGUARDANDO_PAGAMENTO'
  | 'PAGO'
  | 'EM_SEPARACAO'
  | 'ENVIADO'
  | 'ENTREGUE'
  | 'CANCELADO';

export interface PedidoListItem {
  id: string;
  codigo: string;
  canal_venda: string;
  status: PedidoStatus;
  cliente_nome: string;
  cliente_email?: string | null;
  subtotal: number;
  desconto: number;
  frete: number;
  total: number;
  itens_quantidade: number;
  criado_em: string;
  atualizado_em: string;
}

export interface PedidoEntrega {
  tipo_entrega: string;
  status_entrega: string;
  transportadora?: string | null;
  codigo_rastreio?: string | null;
  destinatario_nome: string;
  destinatario_documento?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  prazo_previsto_em?: string | null;
  postado_em?: string | null;
  entregue_em?: string | null;
  observacao?: string | null;
}

export interface PedidoItem {
  livro_id: string;
  titulo_livro: string;
  autor_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface PedidoDetail {
  id: string;
  codigo: string;
  canal_venda: string;
  status: PedidoStatus;
  cliente_nome: string;
  cliente_email?: string | null;
  cliente_whatsapp?: string | null;
  subtotal: number;
  desconto: number;
  frete: number;
  total: number;
  observacao?: string | null;
  itens: PedidoItem[];
  entrega?: PedidoEntrega | null;
  criado_em: string;
  atualizado_em: string;
}

interface PedidoListResponse {
  items: PedidoListItem[];
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async list(search = '', status = ''): Promise<PedidoListItem[]> {
    const response = await firstValueFrom(
      this.http.get<PedidoListResponse>(`${this.apiBaseUrl}/pedidos/`, {
        params: {
          search: search.trim(),
          status: status.trim(),
        },
      })
    );

    return Array.isArray(response?.items) ? response.items : [];
  }

  async findById(id: string): Promise<PedidoDetail> {
    return firstValueFrom(this.http.get<PedidoDetail>(`${this.apiBaseUrl}/pedidos/${encodeURIComponent(id)}`));
  }
}
