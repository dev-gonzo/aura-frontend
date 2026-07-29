import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface TenantDomainResponse {
  dominio: string;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async getDomain(): Promise<TenantDomainResponse> {
    return await firstValueFrom(this.http.get<TenantDomainResponse>(`${this.apiBaseUrl}/tenant/dominio`));
  }

  async updateDomain(dominio: string): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.apiBaseUrl}/tenant/dominio`, { dominio }));
  }
}

