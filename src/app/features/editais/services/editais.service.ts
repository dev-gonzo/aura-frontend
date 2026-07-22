import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface EditalUploadResponse {
  nome_arquivo: string;
  content_type: string;
  tamanho_bytes: number;
  bucket: string;
  key: string;
  url: string;
}

export interface EditalImagePayload {
  base64: string;
  mime: 'image/webp';
  largura: number;
  altura: number;
  tamanho_bytes: number;
  hash_sha256: string;
}

export interface EditalAttachmentPayload {
  nome_arquivo: string;
  content_type: string;
  tamanho_bytes: number;
  bucket: string;
  key: string;
  url: string;
}

export interface EditalPayload {
  capa: EditalImagePayload;
  titulo: string;
  descricao: string;
  anexo: EditalAttachmentPayload | null;
  taxa_inscricao: number | null;
  taxa_publicacao: number | null;
  status: string;
  data_inicio: string;
  data_fim: string;
  total_vagas: number | null;
  data_prevista_publicacao: string;
}

export interface EditalListItem {
  id: string;
  titulo: string;
  descricao: string;
  status: string;
  data_inicio?: string;
  data_fim?: string;
  total_vagas?: number | null;
  data_prevista_publicacao?: string;
  tem_capa: boolean;
  tem_anexo: boolean;
  anexo_nome_arquivo?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface EditalDetail {
  id: string;
  capa: EditalImagePayload;
  titulo: string;
  descricao: string;
  anexo?: EditalAttachmentPayload | null;
  taxa_inscricao?: number | null;
  taxa_publicacao?: number | null;
  status: string;
  data_inicio?: string;
  data_fim?: string;
  total_vagas?: number | null;
  data_prevista_publicacao?: string;
  criado_em: string;
  atualizado_em: string;
}

interface EditalListResponse {
  items: EditalListItem[];
}

@Injectable({ providedIn: 'root' })
export class EditaisService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async uploadArquivo(arquivo: File): Promise<EditalUploadResponse> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);

    return firstValueFrom(
      this.http.post<EditalUploadResponse>(`${this.apiBaseUrl}/editais/upload`, formData)
    );
  }

  async list(search = '', status = ''): Promise<EditalListItem[]> {
    return firstValueFrom(
      this.http.get<EditalListResponse>(`${this.apiBaseUrl}/editais`, {
        params: {
          search,
          status,
        },
      })
    ).then((response) => response.items);
  }

  async findById(id: string): Promise<EditalDetail> {
    return firstValueFrom(this.http.get<EditalDetail>(`${this.apiBaseUrl}/editais/${id}`));
  }

  async create(payload: EditalPayload): Promise<EditalDetail> {
    return firstValueFrom(this.http.post<EditalDetail>(`${this.apiBaseUrl}/editais`, payload));
  }

  async update(id: string, payload: EditalPayload): Promise<EditalDetail> {
    return firstValueFrom(this.http.put<EditalDetail>(`${this.apiBaseUrl}/editais/${id}`, payload));
  }
}
