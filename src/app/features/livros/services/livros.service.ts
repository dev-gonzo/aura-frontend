import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { AuthorPhotoPayload } from '../../autores/services/autores.service';

export interface LivroPayload {
  autor_id: string;
  titulo: string;
  subtitulo?: string;
  sinopse?: string;
  isbn?: string;
  codigo_barra?: string;
  status: string;
  formato: string;
  possui_formato_fisico: boolean;
  possui_formato_digital: boolean;
  edicao?: string;
  idioma?: string;
  numero_paginas?: number | null;
  genero?: string;
  preco_venda?: number | null;
  preco_venda_fisico?: number | null;
  preco_venda_digital?: number | null;
  canal_venda_digital?: string;
  url_compra_digital?: string;
  custo_impressao?: number | null;
  venda_infinita: boolean;
  controlar_estoque: boolean;
  estoque_disponivel?: number | null;
  estoque_minimo?: number | null;
  peso_gramas?: number | null;
  largura_cm?: number | null;
  altura_cm?: number | null;
  profundidade_cm?: number | null;
  tipo_capa?: string;
  possui_box: boolean;
  detalhes_edicao?: string;
  data_publicacao_prevista?: string;
  data_publicacao?: string;
  capa?: AuthorPhotoPayload | null;
  ativo: boolean;
}

export interface LivroListItem {
  id: string;
  autor_id: string;
  autor_nome: string;
  titulo: string;
  subtitulo?: string | null;
  isbn?: string | null;
  codigo_barra?: string | null;
  status: string;
  formato: string;
  possui_formato_fisico: boolean;
  possui_formato_digital: boolean;
  genero?: string | null;
  preco_venda: number;
  preco_venda_fisico: number;
  preco_venda_digital: number;
  canal_venda_digital?: string | null;
  url_compra_digital?: string | null;
  venda_infinita: boolean;
  controlar_estoque: boolean;
  estoque_disponivel: number;
  estoque_minimo: number;
  ativo: boolean;
  possui_capa: boolean;
  capa?: AuthorPhotoPayload | null;
  data_publicacao?: string | null;
  data_publicacao_prevista?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface LivroDetail extends LivroListItem {
  sinopse?: string | null;
  edicao?: string | null;
  idioma?: string | null;
  numero_paginas?: number | null;
  custo_impressao: number;
  estoque_reservado: number;
  peso_gramas?: number | null;
  largura_cm?: number | null;
  altura_cm?: number | null;
  profundidade_cm?: number | null;
  tipo_capa?: string | null;
  possui_box: boolean;
  detalhes_edicao?: string | null;
}

interface LivroListResponse {
  items: LivroListItem[];
}

@Injectable({ providedIn: 'root' })
export class LivrosService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async list(search = '', status = '', autorId = ''): Promise<LivroListItem[]> {
    return firstValueFrom(
      this.http.get<LivroListResponse>(`${this.apiBaseUrl}/livros`, {
        params: { search, status, autor_id: autorId },
      })
    ).then((response) => response.items);
  }

  async findById(id: string): Promise<LivroDetail> {
    return firstValueFrom(this.http.get<LivroDetail>(`${this.apiBaseUrl}/livros/${id}`));
  }

  async create(payload: LivroPayload): Promise<string> {
    return firstValueFrom(this.http.post<{ id: string }>(`${this.apiBaseUrl}/livros`, payload)).then(
      (response) => response.id
    );
  }

  async update(id: string, payload: LivroPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/livros/${id}`, payload));
  }

  async validateIdentifiers(payload: {
    id?: string;
    status: string;
    isbn?: string;
    codigo_barra?: string;
  }): Promise<{ valid: boolean; erros?: string[] }> {
    return firstValueFrom(this.http.post<{ valid: boolean; erros?: string[] }>(`${this.apiBaseUrl}/livros/validate`, payload));
  }
}
