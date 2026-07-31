import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface AbandonedCartListItem {
  id: string;
  session_id: string;
  customer_email: string;
  items_count: number;
  total: number;
  last_activity_at: string;
}

export interface AbandonedCartDetail {
  id: string;
  session_id: string;
  customer_email: string;
  subtotal: number;
  total: number;
  items: unknown[];
  last_activity_at: string;
}

interface AbandonedCartListResponse {
  items: AbandonedCartListItem[];
}

@Injectable({ providedIn: 'root' })
export class AbandonedCartsService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async list(): Promise<AbandonedCartListItem[]> {
    return firstValueFrom(
      this.http.get<AbandonedCartListResponse>(`${this.apiBaseUrl}/loja/carrinhos-abandonados`)
    ).then((response) => response.items || []);
  }

  async get(id: string): Promise<AbandonedCartDetail> {
    return firstValueFrom(
      this.http.get<AbandonedCartDetail>(`${this.apiBaseUrl}/loja/carrinhos-abandonados/${id}`)
    );
  }
}

