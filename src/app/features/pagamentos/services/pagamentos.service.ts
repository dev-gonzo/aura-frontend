import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface PaymentProviderStatus {
  code: string;
  label: string;
  enabled: boolean;
  is_default: boolean;
  configured: boolean;
  sandbox?: boolean;
}

export interface MercadoPagoPayload {
  sandbox: boolean;
  base_url: string;
  public_key: string;
  access_token: string;
  statement_descriptor: string;
  success_url: string;
  failure_url: string;
  pending_url: string;
  webhook_url: string;
  binary_mode: boolean;
  wallet_purchase: boolean;
  installments: number;
}

export interface PaymentSettingsPayload {
  default_provider: string;
  timeout_seconds: number;
  contact_email: string;
  mercado_pago_enabled: boolean;
  mercado_pago: MercadoPagoPayload;
}

export interface PaymentSettingsResponse extends PaymentSettingsPayload {
  providers: PaymentProviderStatus[];
  created_at: string;
  updated_at: string;
}

export interface PaymentCheckoutItemPayload {
  id?: string;
  title: string;
  description?: string;
  picture_url?: string;
  quantity: number;
  unit_price: number;
}

export interface PaymentCheckoutPayerPayload {
  name?: string;
  surname?: string;
  email?: string;
  cpf?: string;
  zip_code?: string;
}

export interface PaymentCheckoutPayload {
  provider?: string;
  external_reference?: string;
  items: PaymentCheckoutItemPayload[];
  payer?: PaymentCheckoutPayerPayload;
  success_url?: string;
  failure_url?: string;
  pending_url?: string;
  notification_url?: string;
}

export interface PaymentCheckoutResponse {
  provider: string;
  external_reference: string;
  preference_id: string;
  checkout_url: string;
  sandbox_checkout_url: string;
  public_key: string;
}

@Injectable({ providedIn: 'root' })
export class PagamentosService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async getConfig(): Promise<PaymentSettingsResponse> {
    return firstValueFrom(
      this.http.get<PaymentSettingsResponse>(`${this.apiBaseUrl}/pagamentos/configuracao`)
    );
  }

  async updateConfig(payload: PaymentSettingsPayload): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiBaseUrl}/pagamentos/configuracao`, payload));
  }

  async createCheckout(payload: PaymentCheckoutPayload): Promise<PaymentCheckoutResponse> {
    return firstValueFrom(
      this.http.post<PaymentCheckoutResponse>(`${this.apiBaseUrl}/pagamentos/checkout`, payload)
    );
  }
}
