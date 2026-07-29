import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../auth/service/auth.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface UsuarioPayload {
  cpf: string;
  email: string;
  nome_completo: string;
  foto: {
    base64: string;
    mime: 'image/webp';
    largura: 1024;
    altura: 1024;
    tamanho_bytes: number;
    hash_sha256: string;
  };
  descricao?: string;
  pseudonimo?: string;
  endereco_principal?: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    pais?: string;
  };
  whatsapp: string;
  data_nascimento: string;
  nacionalidade?: string;
  senha: string;
  papeis: string[];
  origem_cadastro: 'EDITORA';
}

export interface UsuarioListItem {
  id: string;
  cpf: string;
  email: string;
  nome_completo: string;
  plano_inicial?: string;
  pseudonimo?: string;
  whatsapp: string;
  papeis: string[];
  origem_cadastro: string;
  status: string;
  status_codigo: 'ATIVO' | 'PENDENTE_APROVACAO' | 'BLOQUEADO';
  cliente_ativo: boolean;
  foto_url?: string;
  foto?: UsuarioPayload['foto'];
  descricao?: string;
  endereco_principal?: UsuarioPayload['endereco_principal'];
  data_nascimento?: string;
  nacionalidade?: string;
}

export interface UsuarioListParams {
  q?: string;
  role?: string;
  page?: number;
  page_size?: number;
}

export interface UsuarioListResponse {
  items: UsuarioListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

interface UsuarioCreateResponse {
  id?: string;
}

interface UsuarioStatusResponse {
  id: string;
  status: string;
  status_codigo: UsuarioListItem['status_codigo'];
  cliente_ativo: boolean;
}

export interface UsuarioResetPasswordResponse {
  id: string;
  senha_temporaria: string;
  precisa_trocar_senha: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly authService = inject(AuthService);

  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async create(payload: UsuarioPayload): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<UsuarioCreateResponse>(`${this.apiBaseUrl}/usuarios`, payload)
    );

    return this.readString(response?.id);
  }

  async findById(id: string): Promise<UsuarioListItem | null> {
    const response = await firstValueFrom(
      this.http.get<unknown>(`${this.apiBaseUrl}/usuarios/${encodeURIComponent(id)}`)
    );

    return this.mapApiUser(response, 0);
  }

  async update(id: string, payload: UsuarioPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/usuarios/${id}`, payload));

    const session = this.authService.session();
    if (session?.userId !== id) {
      return;
    }

    this.authService.updateSessionProfile({
      nomeCompleto: payload.nome_completo,
      email: payload.email,
      fotoUrl: this.buildPhotoUrl(payload.foto),
    });
  }

  async block(id: string): Promise<UsuarioStatusResponse> {
    return firstValueFrom(
      this.http.patch<UsuarioStatusResponse>(`${this.apiBaseUrl}/usuarios/${id}/block`, {})
    );
  }

  async activate(id: string): Promise<UsuarioStatusResponse> {
    return firstValueFrom(
      this.http.patch<UsuarioStatusResponse>(`${this.apiBaseUrl}/usuarios/${id}/activate`, {})
    );
  }

  async resetPassword(id: string): Promise<UsuarioResetPasswordResponse> {
    return firstValueFrom(
      this.http.post<UsuarioResetPasswordResponse>(`${this.apiBaseUrl}/usuarios/${id}/reset-password`, {})
    );
  }

  async list(params: UsuarioListParams = {}): Promise<UsuarioListResponse> {
    const normalizedParams = {
      q: params.q?.trim() ?? '',
      role: params.role?.trim() ?? '',
      page: params.page && params.page > 0 ? params.page : 1,
      page_size: params.page_size && params.page_size > 0 ? params.page_size : 20,
    };

    const response = await firstValueFrom(
      this.http.get<unknown>(`${this.apiBaseUrl}/usuarios`, {
        params: {
          q: normalizedParams.q,
          role: normalizedParams.role,
          page: normalizedParams.page,
          page_size: normalizedParams.page_size,
        },
      })
    );

    return this.normalizeApiListResponse(response, normalizedParams);
  }

  private normalizeApiListResponse(
    response: unknown,
    params: Required<UsuarioListParams>
  ): UsuarioListResponse {
    const payload = typeof response === 'object' && response !== null ? (response as Record<string, unknown>) : {};
    const items = Array.isArray(payload['items']) ? payload['items'] : [];

    return {
      items: items
        .map((item, index) => this.mapApiUser(item, index))
        .filter((item): item is UsuarioListItem => item !== null),
      page: this.readNumber(payload['page']) || params.page,
      page_size: this.readNumber(payload['page_size']) || params.page_size,
      total: this.readNumber(payload['total']),
      total_pages: this.readNumber(payload['total_pages']),
    };
  }

  private mapApiUser(item: unknown, index: number): UsuarioListItem | null {
    if (typeof item !== 'object' || item === null) {
      return null;
    }

    const record = item as Record<string, unknown>;
    const papeis = Array.isArray(record['papeis'])
      ? record['papeis'].filter((value): value is string => typeof value === 'string')
      : [];

    const foto = this.readPhotoPayload(record);

    return {
      id: this.readString(record['id']) || `usuario-${index}`,
      cpf: this.readString(record['cpf']) || '-',
      email: this.readString(record['email']) || '-',
      nome_completo:
        this.readString(record['nome_completo']) || this.readString(record['nomeCompleto']) || 'Usuário',
      plano_inicial: this.readString(record['plano_inicial']) || undefined,
      pseudonimo: this.readString(record['pseudonimo']) || this.readString(record['pseudonimo_publico']) || undefined,
      whatsapp: this.readString(record['whatsapp']) || '-',
      papeis,
      origem_cadastro:
        this.readString(record['origem_cadastro']) || this.readString(record['origemCadastro']) || 'EDITORA',
      status_codigo: this.readStatusCode(record),
      cliente_ativo: this.readBoolean(record['cliente_ativo'], true),
      status: this.readStatusLabel(record),
      foto_url: this.readPhotoUrl(record),
      foto,
      descricao: this.readString(record['descricao']) || undefined,
      endereco_principal: this.readAddress(record),
      data_nascimento: this.normalizeDateValue(
        record['data_nascimento'] ?? record['dataNascimento'] ?? ''
      ),
      nacionalidade: this.readString(record['nacionalidade']) || undefined,
    };
  }

  private buildPhotoUrl(photo: UsuarioPayload['foto']): string {
    return `data:${photo.mime};base64,${photo.base64}`;
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private readBoolean(value: unknown, fallback = false): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private readNumber(value: unknown): number {
    return typeof value === 'number' ? value : 0;
  }

  private readStatusCode(record: Record<string, unknown>): UsuarioListItem['status_codigo'] {
    const rawStatus = this.readString(record['status_codigo']) || this.readString(record['statusCodigo']);
    switch (rawStatus) {
      case 'BLOQUEADO':
        return 'BLOQUEADO';
      case 'PENDENTE_APROVACAO':
        return 'PENDENTE_APROVACAO';
      default:
        return 'ATIVO';
    }
  }

  private readStatusLabel(record: Record<string, unknown>): string {
    const directLabel = this.readString(record['status']);
    if (directLabel) {
      return directLabel;
    }

    const statusCode = this.readStatusCode(record);
    const clienteAtivo = this.readBoolean(record['cliente_ativo'], true);
    return buildStatusLabel(statusCode, clienteAtivo);
  }

  private readPhotoUrl(record: Record<string, unknown>): string | undefined {
    const directPhotoUrl = this.readString(record['foto_url']) || this.readString(record['fotoUrl']);
    if (directPhotoUrl) {
      return directPhotoUrl;
    }

    const foto = this.readPhotoPayload(record);
    return foto ? this.buildPhotoUrl(foto) : undefined;
  }

  private readPhotoPayload(record: Record<string, unknown>): UsuarioPayload['foto'] | undefined {
    const foto = record['foto'];
    if (typeof foto !== 'object' || foto === null) {
      return undefined;
    }

    const fotoRecord = foto as Record<string, unknown>;
    const base64 = this.readString(fotoRecord['base64']);
    if (!base64) {
      return undefined;
    }

    return {
      base64,
      mime: 'image/webp',
      largura: 1024,
      altura: 1024,
      tamanho_bytes: this.readNumber(fotoRecord['tamanho_bytes']),
      hash_sha256: this.readString(fotoRecord['hash_sha256']),
    };
  }

  private readAddress(
    record: Record<string, unknown>
  ): UsuarioPayload['endereco_principal'] | undefined {
    const address = record['endereco_principal'];
    if (typeof address !== 'object' || address === null) {
      return undefined;
    }

    const addressRecord = address as Record<string, unknown>;
    return {
      cep: this.readString(addressRecord['cep']),
      logradouro: this.readString(addressRecord['logradouro']),
      numero: this.readString(addressRecord['numero']),
      complemento: this.readString(addressRecord['complemento']) || undefined,
      bairro: this.readString(addressRecord['bairro']),
      cidade: this.readString(addressRecord['cidade']),
      uf: this.readString(addressRecord['uf']),
      pais: this.readString(addressRecord['pais']) || 'BRASIL',
    };
  }

  private normalizeDateValue(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/u);
    if (isoMatch) {
      return isoMatch[1];
    }

    const ptBrMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/u);
    if (ptBrMatch) {
      const [, day, month, year] = ptBrMatch;
      return `${year}-${month}-${day}`;
    }

    return trimmed;
  }
}

function buildStatusLabel(
  status: UsuarioListItem['status_codigo'],
  clienteAtivo: boolean
): string {
  switch (status) {
    case 'BLOQUEADO':
      return 'Bloqueado';
    case 'PENDENTE_APROVACAO':
      return clienteAtivo ? 'Cliente ativo' : 'Pendente';
    default:
      return 'Ativo';
  }
}
