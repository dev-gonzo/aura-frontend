import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface CmsPostListItem {
  id: string;
  tipo: string;
  draft_status: string;
  draft_titulo: string;
  draft_slug: string;
  draft_card_image_id: string;
  published_at: string;
  updated_at: string;
}

export interface CmsPostListResponse {
  items: CmsPostListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface CmsPostDetail {
  id: string;
  tipo: string;
  draft_status: string;
  draft_titulo: string;
  draft_slug: string;
  draft_card_image_id: string;
  draft_resumo: string;
  draft_conteudo_html: string;
  draft_capa_image_id: string;
  draft_capa_mobile_image_id: string;
  draft_seo_title: string;
  draft_seo_description: string;
  draft_seo_tags: string;
  draft_review_notes: string;
  draft_updated_at: string;
  draft_submitted_at: string;
  draft_approved_at: string;
  draft_rejected_at: string;
  published_titulo: string;
  published_slug: string;
  published_resumo: string;
  published_conteudo_html: string;
  published_card_image_id: string;
  published_capa_image_id: string;
  published_capa_mobile_image_id: string;
  published_seo_title: string;
  published_seo_description: string;
  published_seo_tags: string;
  published_at: string;
  archived_at: string;
}

export interface CreateCmsPostResponse {
  id: string;
}

export interface UpdateCmsPostRequest {
  draft_titulo: string;
  draft_slug: string;
  draft_card_image_id: string;
  draft_resumo: string;
  draft_conteudo_html: string;
  draft_capa_image_id: string;
  draft_capa_mobile_image_id: string;
  draft_seo_title: string;
  draft_seo_description: string;
  draft_seo_tags: string;
}

@Injectable({ providedIn: 'root' })
export class CmsPostsService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async list(params: {
    tipo: string;
    status: string;
    q: string;
    page: number;
    page_size: number;
  }): Promise<CmsPostListResponse> {
    let httpParams = new HttpParams();
    if (params.tipo) httpParams = httpParams.set('tipo', params.tipo);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.page_size) httpParams = httpParams.set('page_size', params.page_size);

    return firstValueFrom(
      this.http.get<CmsPostListResponse>(`${this.apiBaseUrl}/cms/posts`, {
        params: httpParams,
      })
    );
  }

  async get(id: string): Promise<CmsPostDetail> {
    return firstValueFrom(this.http.get<CmsPostDetail>(`${this.apiBaseUrl}/cms/posts/${id}`));
  }

  async create(tipo: string): Promise<CreateCmsPostResponse> {
    return firstValueFrom(
      this.http.post<CreateCmsPostResponse>(`${this.apiBaseUrl}/cms/posts`, { tipo })
    );
  }

  async update(id: string, request: UpdateCmsPostRequest): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/cms/posts/${id}`, request));
  }

  async submitForReview(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/cms/posts/${id}/enviar-revisao`, {}));
  }

  async approve(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/cms/posts/${id}/aprovar`, {}));
  }

  async reject(id: string, notas: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.apiBaseUrl}/cms/posts/${id}/reprovar`, { notas })
    );
  }

  async publish(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/cms/posts/${id}/publicar`, {}));
  }

  async unpublish(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/cms/posts/${id}/despublicar`, {}));
  }

  async archive(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/cms/posts/${id}/arquivar`, {}));
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/cms/posts/${id}`));
  }
}
