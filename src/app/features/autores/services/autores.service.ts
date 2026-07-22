import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface AuthorPhotoPayload {
  base64: string;
  mime: 'image/webp';
  largura: number;
  altura: number;
  tamanho_bytes: number;
  hash_sha256: string;
}

export interface AutorPayload {
  usuario_id?: string | null;
  nome_completo: string;
  nome_publico?: string;
  email?: string;
  email_privado: boolean;
  whatsapp?: string;
  whatsapp_privado: boolean;
  instagram?: string;
  instagram_privado: boolean;
  wattpad?: string;
  wattpad_privado: boolean;
  facebook?: string;
  facebook_privado: boolean;
  x_twitter?: string;
  x_twitter_privado: boolean;
  tiktok?: string;
  tiktok_privado: boolean;
  youtube?: string;
  youtube_privado: boolean;
  linkedin?: string;
  linkedin_privado: boolean;
  nacionalidade?: string;
  biografia?: string;
  foto?: AuthorPhotoPayload | null;
  status: 'ATIVO' | 'INATIVO';
}

export interface AutorListItem {
  id: string;
  usuario_id?: string | null;
  nome_completo: string;
  nome_publico?: string | null;
  nome_exibicao: string;
  email?: string | null;
  email_privado: boolean;
  whatsapp?: string | null;
  whatsapp_privado: boolean;
  instagram?: string | null;
  instagram_privado: boolean;
  wattpad?: string | null;
  wattpad_privado: boolean;
  facebook?: string | null;
  facebook_privado: boolean;
  x_twitter?: string | null;
  x_twitter_privado: boolean;
  tiktok?: string | null;
  tiktok_privado: boolean;
  youtube?: string | null;
  youtube_privado: boolean;
  linkedin?: string | null;
  linkedin_privado: boolean;
  nacionalidade?: string | null;
  status: 'ATIVO' | 'INATIVO';
  usuario_nome?: string | null;
  possui_foto: boolean;
  foto?: AuthorPhotoPayload | null;
  criado_em: string;
  atualizado_em: string;
}

export interface AutorDetail extends AutorListItem {
  biografia?: string | null;
}

interface AutorListResponse {
  items: AutorListItem[];
}

@Injectable({ providedIn: 'root' })
export class AutoresService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async list(search = '', status = ''): Promise<AutorListItem[]> {
    return firstValueFrom(
      this.http.get<AutorListResponse>(`${this.apiBaseUrl}/autores`, {
        params: { search, status },
      })
    ).then((response) => response.items);
  }

  async findById(id: string): Promise<AutorDetail> {
    return firstValueFrom(this.http.get<AutorDetail>(`${this.apiBaseUrl}/autores/${id}`));
  }

  async create(payload: AutorPayload): Promise<string> {
    return firstValueFrom(this.http.post<{ id: string }>(`${this.apiBaseUrl}/autores`, payload)).then(
      (response) => response.id
    );
  }

  async update(id: string, payload: AutorPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/autores/${id}`, payload));
  }
}
