import { Injectable, inject } from '@angular/core';

import { AuthService } from './auth.service';

type PendingWindow = {
  tokenPromise: Promise<string | null>;
};

@Injectable({ providedIn: 'root' })
export class AdminPreviewSsoService {
  private readonly authService = inject(AuthService);
  private readonly pending = new Map<Window, PendingWindow>();

  constructor() {
    globalThis.window?.addEventListener('message', this.handleMessage);
  }

  async open(url: string): Promise<void> {
    const target = globalThis.window?.open(url, '_blank');
    if (!target) {
      return;
    }

    this.pending.set(target, { tokenPromise: this.authService.ensureAccessToken() });
  }

  private readonly handleMessage = async (event: MessageEvent): Promise<void> => {
    const data = event.data as { type?: string } | null;
    if (!data || data.type !== 'AURA_STOREFRONT_SSO_READY') {
      return;
    }

    const sourceWindow = event.source as Window | null;
    if (!sourceWindow) {
      return;
    }

    const pending = this.pending.get(sourceWindow);
    if (!pending) {
      return;
    }

    const token = await pending.tokenPromise;
    if (!token) {
      this.pending.delete(sourceWindow);
      return;
    }

    sourceWindow.postMessage({ type: 'AURA_ADMIN_SSO_TOKEN', token }, event.origin);
    this.pending.delete(sourceWindow);
  };
}

