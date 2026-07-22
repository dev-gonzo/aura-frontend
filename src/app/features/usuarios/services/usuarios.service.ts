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
  private readonly cacheKey = 'aura-usuarios-list-cache';

  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async create(payload: UsuarioPayload): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<UsuarioCreateResponse>(`${this.apiBaseUrl}/usuarios`, payload)
    );
    const persistedId = this.readString(response?.id) || createLocalUserId();
    this.persistLocalUser(payload, persistedId);
    return persistedId;
  }

  async findById(id: string): Promise<UsuarioListItem | null> {
    const localUser = this.readAllAvailableUsers().find((user) => user.id === id) ?? null;
    if (!isUuid(id)) {
      return localUser;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<unknown>(`${this.apiBaseUrl}/usuarios/${encodeURIComponent(id)}`)
      );

      return this.mapApiUser(response, 0) ?? localUser;
    } catch {
      return localUser;
    }
  }

  async update(id: string, payload: UsuarioPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/usuarios/${id}`, payload));
    this.persistLocalUser(payload, id);
  }

  async block(id: string): Promise<UsuarioStatusResponse> {
    const response = await firstValueFrom(
      this.http.patch<UsuarioStatusResponse>(`${this.apiBaseUrl}/usuarios/${id}/block`, {})
    );
    this.updateLocalStatus(id, response);
    return response;
  }

  async activate(id: string): Promise<UsuarioStatusResponse> {
    const response = await firstValueFrom(
      this.http.patch<UsuarioStatusResponse>(`${this.apiBaseUrl}/usuarios/${id}/activate`, {})
    );
    this.updateLocalStatus(id, response);
    return response;
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

    try {
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
      const apiResponse = this.normalizeApiListResponse(response, normalizedParams);

      if (apiResponse.items.length > 0 || apiResponse.total > 0) {
        return {
          ...apiResponse,
          items: this.mergeUsers(apiResponse.items, this.readLocalUsers()),
        };
      }
    } catch {
      // Enquanto o backend de listagem nao estiver pronto, a tela segue funcional via cache local.
    }

    return this.buildLocalListResponse(normalizedParams);
  }

  private normalizeApiListResponse(
    response: unknown,
    params: Required<UsuarioListParams>
  ): UsuarioListResponse {
    const payload = typeof response === 'object' && response !== null ? response as Record<string, unknown> : {};
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

    return {
      id: this.readString(record['id']) || `usuario-${index}`,
      cpf: this.readString(record['cpf']) || '-',
      email: this.readString(record['email']) || '-',
      nome_completo:
        this.readString(record['nome_completo']) || this.readString(record['nomeCompleto']) || 'Usuário',
      pseudonimo: this.readString(record['pseudonimo']) || this.readString(record['pseudonimo_publico']),
      whatsapp: this.readString(record['whatsapp']) || '-',
      papeis,
      origem_cadastro:
        this.readString(record['origem_cadastro']) || this.readString(record['origemCadastro']) || 'EDITORA',
      status_codigo: this.readStatusCode(record),
      cliente_ativo: this.readBoolean(record['cliente_ativo'], true),
      status: this.readStatusLabel(record),
      foto_url: this.readPhotoUrl(record),
      foto: this.readPhotoPayload(record),
      descricao: this.readString(record['descricao']),
      endereco_principal: this.readAddress(record),
      data_nascimento: this.normalizeDateValue(
        record['data_nascimento'] ?? record['dataNascimento'] ?? ''
      ),
      nacionalidade: this.readString(record['nacionalidade']),
    };
  }

  private persistLocalUser(payload: UsuarioPayload, userId?: string): void {
    const photoUrl = `data:${payload.foto.mime};base64,${payload.foto.base64}`;
    const current = this.readLocalUsers();
    const statusMetadata = this.getLocalUserStatusMetadata(payload);
    const nextItem: UsuarioListItem = {
      id: userId ?? `${payload.cpf}-${Date.now()}`,
      cpf: payload.cpf,
      email: payload.email,
      nome_completo: payload.nome_completo,
      pseudonimo: payload.pseudonimo,
      whatsapp: payload.whatsapp,
      papeis: payload.papeis,
      origem_cadastro: payload.origem_cadastro,
      status: statusMetadata.status,
      status_codigo: statusMetadata.status_codigo,
      cliente_ativo: statusMetadata.cliente_ativo,
      foto_url: photoUrl,
      foto: payload.foto,
      descricao: payload.descricao,
      endereco_principal: payload.endereco_principal,
      data_nascimento: payload.data_nascimento,
      nacionalidade: payload.nacionalidade,
    };

    const merged = this.mergeUsers(current, [nextItem]);
    localStorage.setItem(this.cacheKey, JSON.stringify(merged));

    const session = this.authService.session();
    if (session?.userId === nextItem.id) {
      this.authService.updateSessionProfile({
        nomeCompleto: nextItem.nome_completo,
        email: nextItem.email,
        fotoUrl: photoUrl,
      });
    }
  }

  private readLocalUsers(): UsuarioListItem[] {
    const raw = localStorage.getItem(this.cacheKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      const normalizedUsers = parsed
        .map((item, index) => this.mapApiUser(item, index))
        .filter((item): item is UsuarioListItem => item !== null);
      const sanitizedUsers = this.sanitizeLegacyLocalIds(normalizedUsers);

      if (JSON.stringify(sanitizedUsers) !== JSON.stringify(normalizedUsers)) {
        localStorage.setItem(this.cacheKey, JSON.stringify(sanitizedUsers));
      }

      return sanitizedUsers;
    } catch {
      localStorage.removeItem(this.cacheKey);
      return [];
    }
  }

  private getSeedUsers(): UsuarioListItem[] {
    const session = this.authService.session();
    if (!session) {
      return [];
    }

    return [
      {
        id: session.userId,
        cpf: '52998224725',
        email: session.email,
        nome_completo: session.nomeCompleto,
        pseudonimo: '',
        whatsapp: '-',
        papeis: session.papeis,
        origem_cadastro: 'EDITORA',
        status: 'Ativo',
        status_codigo: 'ATIVO',
        cliente_ativo: true,
        foto_url: session.fotoUrl,
      },
    ];
  }

  private mergeUsers(primary: UsuarioListItem[], secondary: UsuarioListItem[]): UsuarioListItem[] {
    const map = new Map<string, UsuarioListItem>();

    for (const user of [...secondary, ...primary]) {
      const key = `${user.cpf}|${user.email}`.toLowerCase();
      map.set(key, user);
    }

    return Array.from(map.values()).sort((left, right) =>
      left.nome_completo.localeCompare(right.nome_completo, 'pt-BR')
    );
  }

  private buildLocalListResponse(params: Required<UsuarioListParams>): UsuarioListResponse {
    const allUsers = this.readAllAvailableUsers();
    const normalizedTerm = normalizeForSearch(params.q);
    const normalizedRole = params.role.toUpperCase();

    const filtered = allUsers.filter((user) => {
      const matchesRole =
        !normalizedRole || normalizedRole === 'TODOS' || user.papeis.includes(normalizedRole);
      if (!matchesRole) {
        return false;
      }

      if (!normalizedTerm) {
        return true;
      }

      const haystack = [
        user.nome_completo,
        user.cpf,
        user.pseudonimo ?? '',
        user.whatsapp,
      ]
        .map((value) => normalizeForSearch(value))
        .join(' ');

      return haystack.includes(normalizedTerm);
    });

    const start = (params.page - 1) * params.page_size;
    const end = start + params.page_size;
    const totalPages = filtered.length > 0 ? Math.ceil(filtered.length / params.page_size) : 0;

    return {
      items: filtered.slice(start, end),
      page: params.page,
      page_size: params.page_size,
      total: filtered.length,
      total_pages: totalPages,
    };
  }

  private readAllAvailableUsers(): UsuarioListItem[] {
    return this.mergeUsers(this.getSeedUsers(), this.readLocalUsers());
  }

  private sanitizeLegacyLocalIds(users: UsuarioListItem[]): UsuarioListItem[] {
    return users.map((user) => {
      if (!isLegacySensitiveLocalId(user.id)) {
        return user;
      }

      return {
        ...user,
        id: createLocalUserId(),
      };
    });
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private readBoolean(value: unknown, fallback = false): boolean {
    return typeof value === 'boolean' ? value : fallback;
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

    const foto = record['foto'];
    if (typeof foto !== 'object' || foto === null) {
      return undefined;
    }

    const fotoRecord = foto as Record<string, unknown>;
    const base64 = this.readString(fotoRecord['base64']);
    const mime = this.readString(fotoRecord['mime']) || 'image/webp';

    if (!base64) {
      return undefined;
    }

    return `data:${mime};base64,${base64}`;
  }

  private readPhotoPayload(record: Record<string, unknown>): UsuarioPayload['foto'] | undefined {
    const directPhotoUrl = this.readString(record['foto_url']) || this.readString(record['fotoUrl']);
    const directPhotoPayload = this.parsePhotoPayloadFromDataUrl(directPhotoUrl);
    if (directPhotoPayload) {
      return directPhotoPayload;
    }

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

  private parsePhotoPayloadFromDataUrl(photoUrl: string): UsuarioPayload['foto'] | undefined {
    if (!photoUrl.startsWith('data:image/webp;base64,')) {
      return undefined;
    }

    const base64 = photoUrl.split(',')[1] ?? '';
    if (!base64) {
      return undefined;
    }

    return {
      base64,
      mime: 'image/webp',
      largura: 1024,
      altura: 1024,
      tamanho_bytes: this.estimateBase64Size(base64),
      hash_sha256: '',
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
      complemento: this.readString(addressRecord['complemento']),
      bairro: this.readString(addressRecord['bairro']),
      cidade: this.readString(addressRecord['cidade']),
      uf: this.readString(addressRecord['uf']),
      pais: this.readString(addressRecord['pais']) || 'BRASIL',
    };
  }

  private readNumber(value: unknown): number {
    return typeof value === 'number' ? value : 0;
  }

  private estimateBase64Size(base64: string): number {
    const padding = (base64.match(/=+$/u)?.[0].length ?? 0);
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
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

  private updateLocalStatus(id: string, response: UsuarioStatusResponse): void {
    const current = this.readLocalUsers();
    const next = current.map((user) =>
      user.id === id
        ? {
            ...user,
            status: response.status,
            status_codigo: response.status_codigo,
            cliente_ativo: response.cliente_ativo,
          }
        : user
    );

    localStorage.setItem(this.cacheKey, JSON.stringify(next));
  }

  private getLocalUserStatusMetadata(payload: UsuarioPayload): Pick<UsuarioListItem, 'status' | 'status_codigo' | 'cliente_ativo'> {
    const hasElevatedRole = payload.papeis.some((role) => role !== 'CLIENTE');
    if (payload.origem_cadastro !== 'EDITORA' && hasElevatedRole) {
      return {
        status: 'Cliente ativo',
        status_codigo: 'PENDENTE_APROVACAO',
        cliente_ativo: true,
      };
    }

    return {
      status: 'Ativo',
      status_codigo: 'ATIVO',
      cliente_ativo: true,
    };
  }
}

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value.trim()
  );
}

function isLegacySensitiveLocalId(value: string): boolean {
  return /^\d{11}-\d+$/u.test(value.trim());
}

function createLocalUserId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
