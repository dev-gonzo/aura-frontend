import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { UsuarioListItem, UsuariosService } from '../../services/usuarios.service';

type UserRoleFilter = 'TODOS' | 'ADMIN' | 'EDITOR' | 'FUNC' | 'ESCRITOR' | 'CLIENTE';

@Component({
  selector: 'app-user-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './user-list.page.html',
  styleUrl: './user-list.page.css'
})
export class UserListPage implements OnInit {
  private readonly usuariosService = inject(UsuariosService);
  private searchDebounceId: number | null = null;
  private readonly brokenPhotoIds = signal<Set<string>>(new Set());

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly selectedRole = signal<UserRoleFilter>('TODOS');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly users = signal<UsuarioListItem[]>([]);
  protected readonly roleFilters: UserRoleFilter[] = [
    'TODOS',
    'ADMIN',
    'EDITOR',
    'FUNC',
    'ESCRITOR',
    'CLIENTE',
  ];
  protected readonly filteredUsers = computed(() => this.users());
  protected readonly resultLabel = computed(() => {
    const total = this.total();
    return total === 1 ? '1 usuário encontrado' : `${total} usuários encontrados`;
  });

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  protected updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.page.set(1);
    this.scheduleLoadUsers();
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
    this.page.set(1);
    this.scheduleLoadUsers();
  }

  protected selectRole(role: UserRoleFilter): void {
    this.selectedRole.set(role);
    this.page.set(1);
    void this.loadUsers();
  }

  protected previousPage(): void {
    if (this.page() <= 1) {
      return;
    }

    this.page.update((current) => current - 1);
    void this.loadUsers();
  }

  protected nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }

    this.page.update((current) => current + 1);
    void this.loadUsers();
  }

  protected getRoleCount(role: UserRoleFilter): number {
    if (role === 'TODOS') {
      return this.total();
    }

    return this.users().filter((user) => user.papeis.includes(role)).length;
  }

  protected getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected shouldShowPhoto(user: UsuarioListItem): boolean {
    return !!user.foto_url && !this.brokenPhotoIds().has(user.id);
  }

  protected handlePhotoError(userId: string): void {
    this.brokenPhotoIds.update((current) => {
      const next = new Set(current);
      next.add(userId);
      return next;
    });
  }

  protected trackUser(user: UsuarioListItem): string {
    return `${user.id}-${user.cpf}`;
  }

  protected getStatusBadgeClass(user: UsuarioListItem): string {
    switch (user.status_codigo) {
      case 'BLOQUEADO':
        return 'is-blocked';
      case 'PENDENTE_APROVACAO':
        return 'is-pending';
      default:
        return 'is-active';
    }
  }

  private async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.brokenPhotoIds.set(new Set());

    try {
      const response = await this.usuariosService.list({
        q: this.searchTerm(),
        role: this.selectedRole() === 'TODOS' ? '' : this.selectedRole(),
        page: this.page(),
        page_size: this.pageSize(),
      });
      this.users.set(response.items);
      this.total.set(response.total);
      this.totalPages.set(response.total_pages);
      this.page.set(response.page);
    } catch (error) {
      this.errorMessage.set(extractErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private scheduleLoadUsers(): void {
    if (this.searchDebounceId !== null) {
      window.clearTimeout(this.searchDebounceId);
    }

    this.searchDebounceId = window.setTimeout(() => {
      void this.loadUsers();
      this.searchDebounceId = null;
    }, 300);
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar a listagem de usuarios.';
}
