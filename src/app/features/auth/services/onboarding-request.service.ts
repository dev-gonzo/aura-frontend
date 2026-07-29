import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

export interface OnboardingRequestPayload {
  tipo_operacao: 'EDITORA' | 'AUTOR';
  plano_inicial: 'FREE' | 'BASIC' | 'PREMIUM';
  nome_operacao: string;
  dominio: string;
  responsavel_nome: string;
  documento: string;
  email: string;
  whatsapp: string;
  data_nascimento: string;
  senha: string;
  mensagem?: string;
}

export interface OnboardingRequestResponse {
  id: string;
  email: string;
  nome_completo: string;
  plano_inicial: 'FREE' | 'BASIC' | 'PREMIUM';
  nome_operacao: string;
}

@Injectable({ providedIn: 'root' })
export class OnboardingRequestService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {}

  async create(payload: OnboardingRequestPayload): Promise<OnboardingRequestResponse> {
    return firstValueFrom(
      this.http.post<OnboardingRequestResponse>(
        `${this.apiBaseUrl}/publico/onboarding/solicitacoes`,
        payload
      )
    );
  }
}
