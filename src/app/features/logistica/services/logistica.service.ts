import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface LogisticsProviderStatus {
  code: string;
  label: string;
  enabled: boolean;
  is_default: boolean;
  configured: boolean;
  sandbox?: boolean;
}

export interface LogisticsOriginPayload {
  name: string;
  cep: string;
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
}

export interface MelhorEnvioPayload {
  sandbox: boolean;
  base_url: string;
  access_token: string;
  refresh_token: string;
  client_id: string;
  client_secret: string;
  redirect_url: string;
  user_agent: string;
}

export interface SuperFretePayload {
  sandbox: boolean;
  base_url: string;
  token: string;
  user_agent: string;
  services: string;
}

export interface LoggiPayload {
  sandbox: boolean;
  base_url: string;
  company_id: string;
  client_id: string;
  client_secret: string;
  pickup_type: string;
  external_service_id: string;
}

export interface FrenetPayload {
  sandbox: boolean;
  base_url: string;
  token: string;
  platform: string;
  platform_ver: string;
}

export interface LogisticsSettingsPayload {
  default_provider: string;
  timeout_seconds: number;
  contact_email: string;
  origin: LogisticsOriginPayload;
  melhor_envio_enabled: boolean;
  melhor_envio: MelhorEnvioPayload;
  superfrete_enabled: boolean;
  superfrete: SuperFretePayload;
  loggi_enabled: boolean;
  loggi: LoggiPayload;
  frenet_enabled: boolean;
  frenet: FrenetPayload;
}

export interface LogisticsSettingsResponse extends LogisticsSettingsPayload {
  providers: LogisticsProviderStatus[];
  created_at: string;
  updated_at: string;
}

export interface LogisticsQuoteItemPayload {
  livro_id: string;
  quantidade: number;
}

export interface LogisticsQuotePackagePayload {
  peso_kg: number;
  largura_cm: number;
  altura_cm: number;
  comprimento_cm: number;
}

export interface LogisticsQuotePayload {
  provider: string;
  cep_destino: string;
  itens?: LogisticsQuoteItemPayload[];
  pacote?: LogisticsQuotePackagePayload;
  valor_declarado?: number;
  servicos?: number[];
  recebimento_proprio?: boolean;
  maos_proprias?: boolean;
  aviso_recebimento?: boolean;
}

export interface LogisticsQuoteOption {
  provider: string;
  service_code: string;
  service_name: string;
  carrier_name: string;
  carrier_picture_url?: string;
  price: number;
  custom_price?: number;
  currency?: string;
  delivery_days?: number;
  error?: string;
}

export interface LogisticsQuoteResponse {
  provider: string;
  cep_origem: string;
  cep_destino: string;
  subtotal_fisico: number;
  opcoes: LogisticsQuoteOption[];
}

@Injectable({ providedIn: 'root' })
export class LogisticaService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async getConfig(): Promise<LogisticsSettingsResponse> {
    return firstValueFrom(
      this.http.get<LogisticsSettingsResponse>(`${this.apiBaseUrl}/logistica/configuracao`)
    );
  }

  async updateConfig(payload: LogisticsSettingsPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/logistica/configuracao`, payload));
  }

  async calculateQuote(payload: LogisticsQuotePayload): Promise<LogisticsQuoteResponse> {
    return firstValueFrom(
      this.http.post<LogisticsQuoteResponse>(`${this.apiBaseUrl}/logistica/cotacoes`, payload)
    );
  }
}
