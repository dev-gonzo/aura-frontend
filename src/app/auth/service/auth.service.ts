import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/tokens/api-base-url.token';

export interface AuthSession {
  token: string;
  userId: string;
  nomeCompleto: string;
  email: string;
  papeis: string[];
  precisaTrocarSenha: boolean;
  fotoUrl?: string;
}

export interface LoginPayload {
  login: string;
  senha: string;
}

export interface ChangePasswordPayload {
  senha_atual: string;
  nova_senha: string;
}

interface LoginResponse {
  token: string;
  user_id: string;
  nome_completo: string;
  email: string;
  papeis: string[];
  precisa_trocar_senha: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'aura-auth-token';
  private readonly sessionKey = 'aura-auth-session';
  private readonly _session = signal<AuthSession | null>(this.readStoredSession());

  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => !!this._session());
  readonly mustChangePassword = computed(() => this._session()?.precisaTrocarSenha ?? false);
  readonly isAdmin = computed(() => this._session()?.papeis.includes('ADMIN') ?? false);

  constructor(@Inject(API_BASE_URL) private readonly apiBaseUrl: string) {}

  async login(payload: LoginPayload): Promise<AuthSession> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, payload)
    );

    const session: AuthSession = {
      token: response.token,
      userId: response.user_id,
      nomeCompleto: response.nome_completo,
      email: response.email,
      papeis: response.papeis,
      precisaTrocarSenha: response.precisa_trocar_senha,
    };

    this.persistSession(session);
    return session;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.sessionKey);
    this._session.set(null);
    void this.router.navigate(['/login']);
  }

  hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return this._session()?.token ?? localStorage.getItem(this.tokenKey);
  }

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/auth/change-password`, payload));

    const current = this._session();
    if (!current) {
      return;
    }

    this.persistSession({
      ...current,
      precisaTrocarSenha: false,
    });
  }

  hasRole(role: string): boolean {
    return this._session()?.papeis.includes(role) ?? false;
  }

  updateSessionProfile(profile: Partial<Pick<AuthSession, 'nomeCompleto' | 'email' | 'fotoUrl'>>): void {
    const current = this._session();
    if (!current) {
      return;
    }

    this.persistSession({
      ...current,
      ...profile,
    });
  }

  private persistSession(session: AuthSession): void {
    localStorage.setItem(this.tokenKey, session.token);
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    this._session.set(session);
  }

  private readStoredSession(): AuthSession | null {
    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(this.sessionKey);
      localStorage.removeItem(this.tokenKey);
      return null;
    }
  }
}
