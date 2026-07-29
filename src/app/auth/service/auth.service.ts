import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/tokens/api-base-url.token';

export interface AuthSession {
  token: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
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
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string;
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
  private readonly sessionKey = 'aura-auth-session';
  private readonly _session = signal<AuthSession | null>(this.readStoredSession());
  private refreshPromise: Promise<AuthSession | null> | null = null;
  private sessionExpiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => this.hasRefreshWindow(this._session()));
  readonly mustChangePassword = computed(() => this._session()?.precisaTrocarSenha ?? false);
  readonly isAdmin = computed(() => this._session()?.papeis.includes('ADMIN') ?? false);

  constructor(@Inject(API_BASE_URL) private readonly apiBaseUrl: string) {
    const current = this._session();
    if (current) {
      this.scheduleSessionExpiry(current);
    }
  }

  async login(payload: LoginPayload): Promise<AuthSession> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, payload)
    );

    const session = this.mapLoginResponse(response);
    this.persistSession(session);
    return session;
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  hasToken(): boolean {
    return !!this.currentAccessToken();
  }

  getToken(): string | null {
    return this.currentAccessToken();
  }

  async ensureAuthenticated(): Promise<boolean> {
    const current = this._session();
    if (!current) {
      return false;
    }

    if (this.isAccessValid(current)) {
      return true;
    }

    if (!this.hasRefreshWindow(current)) {
      this.clearSession();
      return false;
    }

    return !!(await this.refreshSession());
  }

  async ensureAccessToken(): Promise<string | null> {
    const current = this._session();
    if (!current) {
      return null;
    }

    if (this.isAccessValid(current)) {
      return current.token;
    }

    if (!this.hasRefreshWindow(current)) {
      this.clearSession();
      return null;
    }

    const refreshed = await this.refreshSession();
    return refreshed?.token ?? null;
  }

  async refreshSession(): Promise<AuthSession | null> {
    const current = this._session();
    if (!current || !this.hasRefreshWindow(current)) {
      this.clearSession();
      return null;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = firstValueFrom(
      this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/refresh`, {
        refresh_token: current.refreshToken,
      })
    )
      .then((response) => {
        const session = this.mapLoginResponse(response, current.fotoUrl);
        this.persistSession(session);
        return session;
      })
      .catch(() => {
        this.clearSession();
        return null;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
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
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    this._session.set(session);
    this.scheduleSessionExpiry(session);
  }

  private clearSession(): void {
    if (this.sessionExpiryTimer) {
      clearTimeout(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }
    localStorage.removeItem(this.sessionKey);
    this._session.set(null);
  }

  private currentAccessToken(): string | null {
    const current = this._session();
    if (!current || !this.isAccessValid(current)) {
      return null;
    }

    return current.token;
  }

  private isAccessValid(session: AuthSession): boolean {
    return this.isFutureDate(session.accessExpiresAt);
  }

  private hasRefreshWindow(session: AuthSession | null): boolean {
    if (!session) {
      return false;
    }

    return this.isFutureDate(session.refreshExpiresAt);
  }

  private isFutureDate(value: string): boolean {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && timestamp > Date.now();
  }

  private mapLoginResponse(response: LoginResponse, fotoUrl?: string): AuthSession {
    return {
      token: response.token,
      refreshToken: response.refresh_token,
      accessExpiresAt: response.access_expires_at,
      refreshExpiresAt: response.refresh_expires_at,
      userId: response.user_id,
      nomeCompleto: response.nome_completo,
      email: response.email,
      papeis: response.papeis,
      precisaTrocarSenha: response.precisa_trocar_senha,
      fotoUrl,
    };
  }

  private readStoredSession(): AuthSession | null {
    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as AuthSession;
      if (!this.hasRefreshWindow(session)) {
        localStorage.removeItem(this.sessionKey);
        return null;
      }

      return session;
    } catch {
      localStorage.removeItem(this.sessionKey);
      return null;
    }
  }

  private scheduleSessionExpiry(session: AuthSession): void {
    if (this.sessionExpiryTimer) {
      clearTimeout(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }

    const expiresAt = Date.parse(session.refreshExpiresAt);
    if (!Number.isFinite(expiresAt)) {
      return;
    }

    const timeout = expiresAt - Date.now();
    if (timeout <= 0) {
      this.clearSession();
      void this.router.navigate(['/login']);
      return;
    }

    this.sessionExpiryTimer = setTimeout(() => {
      this.clearSession();
      void this.router.navigate(['/login']);
    }, timeout);
  }
}
