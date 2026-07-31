import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface CmsImagePayload {
  base64: string;
  mime: 'image/webp';
  largura: number;
  altura: number;
  tamanho_bytes: number;
  hash_sha256: string;
}

export interface CreateCmsImageResponse {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class CmsImagesService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async create(payload: CmsImagePayload): Promise<CreateCmsImageResponse> {
    return firstValueFrom(
      this.http.post<CreateCmsImageResponse>(`${this.apiBaseUrl}/cms/images`, { image: payload })
    );
  }

  rawUrl(id: string): string {
    return `${this.apiBaseUrl}/cms/images/${id}/raw`;
  }

  async getRawBlob(id: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(this.rawUrl(id), {
        responseType: 'blob',
      })
    );
  }
}
