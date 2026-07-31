import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../auth/service/auth.service';
import { processApiError } from '../../core/utils/process-api-error';
import { passwordConfirmationValidator } from '../../core/validators/password-confirmation.validator';
import { ModalComponent } from '../../shared/components/feedback/modal/modal.component';
import { UsuariosService } from '../../features/usuarios/services/usuarios.service';

type NavItem = {
  label: string;
  route: string;
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ModalComponent,
  ],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css'
})
export class AuthLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly usuariosService = inject(UsuariosService);
  private readonly router = inject(Router);

  protected readonly sidebarOpen = signal(false);
  protected readonly profileMenuOpen = signal(false);
  protected readonly currentUserPhotoUrl = signal<string | null>(null);
  protected readonly avatarImageFailed = signal(false);
  protected readonly passwordModalOpen = signal(false);
  protected readonly passwordSaving = signal(false);
  protected readonly passwordSubmitted = signal(false);
  protected readonly passwordErrorMessage = signal('');
  protected readonly passwordSuccessMessage = signal('');
  protected readonly navSections = computed<NavSection[]>(() => {
    const sections: NavSection[] = [
      {
        title: 'Painel',
        items: [{ label: 'Dashboard', route: '/painel', badge: 'Ao vivo' }],
      },
    ];

    if (this.authService.hasRole('ADMIN') || this.authService.hasRole('EDITOR')) {
      sections.push({
        title: 'Conteúdo',
        items: [
          { label: 'Contos', route: '/painel/cms/contos' },
          { label: 'Artigos', route: '/painel/cms/artigos' },
          { label: 'Blog', route: '/painel/cms/blog' },
        ],
      });
    }

    if (this.authService.isAdmin()) {
      sections.push({
        title: 'Catálogo',
        items: [
          { label: 'Autores', route: '/painel/autores' },
          { label: 'Livros', route: '/painel/livros' },
          { label: 'Editais', route: '/painel/editais' },
          { label: 'Usuários', route: '/painel/usuarios' },
        ],
      });
      sections.push({
        title: 'Loja',
        items: [
          { label: 'Domínio', route: '/painel/loja/dominio' },
          { label: 'Layout', route: '/painel/loja/layout' },
          { label: 'Carrinhos', route: '/painel/loja/carrinhos-abandonados' },
          { label: 'Categorias', route: '/painel/loja/categorias' },
          { label: 'Produtos', route: '/painel/loja/produtos' },
          { label: 'Pedidos', route: '/painel/pedidos' },
        ],
      });
      sections.push({
        title: 'Configurações',
        items: [
          { label: 'Integrações', route: '/painel/loja/integracoes' },
          { label: 'Fretes', route: '/painel/logistica/cotacao' },
          { label: 'Logística', route: '/painel/logistica/configuracao' },
          { label: 'Pagamentos', route: '/painel/pagamentos/configuracao' },
          { label: 'Checkout', route: '/painel/pagamentos/checkout' },
        ],
      });
    }

    return sections;
  });

  protected readonly currentUserName = computed(
    () => this.authService.session()?.nomeCompleto ?? 'Usuário Aura'
  );
  protected readonly currentUserRoles = computed(
    () => this.authService.session()?.papeis.join(', ') ?? 'CLIENTE'
  );
  protected readonly shouldShowAvatarPhoto = computed(
    () => !!this.currentUserPhotoUrl() && !this.avatarImageFailed()
  );
  protected readonly currentUserInitials = computed(() => {
    const name = this.currentUserName();
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });
  protected readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      senha_atual: ['', Validators.required],
      nova_senha: ['', [Validators.required, Validators.minLength(5)]],
      confirmacao_senha: ['', Validators.required],
    },
    {
      validators: passwordConfirmationValidator,
    }
  );

  protected toggleSidebar(): void {
    this.sidebarOpen.update((current) => !current);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUserProfile();
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen.update((current) => !current);
  }

  @HostListener('document:mousedown', ['$event'])
  protected handleDocumentMouseDown(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (this.profileMenuOpen() && !target.closest('.profile-menu-shell')) {
      this.profileMenuOpen.set(false);
    }
  }

  protected async goToProfile(): Promise<void> {
    this.profileMenuOpen.set(false);
    await this.router.navigate(['/painel/usuarios/novo'], {
      queryParams: { editar: this.authService.session()?.userId ?? '' },
    });
  }

  protected openPasswordModal(): void {
    this.profileMenuOpen.set(false);
    this.passwordSubmitted.set(false);
    this.passwordErrorMessage.set('');
    this.passwordSuccessMessage.set('');
    this.passwordForm.reset({
      senha_atual: '',
      nova_senha: '',
      confirmacao_senha: '',
    });
    this.passwordModalOpen.set(true);
  }

  protected closePasswordModal(): void {
    this.passwordModalOpen.set(false);
    this.passwordSaving.set(false);
    this.passwordSubmitted.set(false);
    this.passwordErrorMessage.set('');
    this.passwordSuccessMessage.set('');
  }

  protected hasPasswordFieldError(field: 'senha_atual' | 'nova_senha' | 'confirmacao_senha'): boolean {
    const control = this.passwordForm.controls[field];
    const hasMismatch = field === 'confirmacao_senha' && !!this.passwordForm.errors?.['passwordMismatch'];
    return (control.invalid || hasMismatch) && (control.touched || this.passwordSubmitted());
  }

  protected getPasswordFieldError(field: 'senha_atual' | 'nova_senha' | 'confirmacao_senha'): string {
    const control = this.passwordForm.controls[field];
    if (control.errors?.['required']) {
      switch (field) {
        case 'senha_atual':
          return 'Informe a senha atual.';
        case 'nova_senha':
          return 'Informe a nova senha.';
        default:
          return 'Confirme a nova senha.';
      }
    }

    if (control.errors?.['minlength']) {
      return 'A nova senha deve ter pelo menos 5 caracteres.';
    }

    if (field === 'confirmacao_senha' && this.passwordForm.errors?.['passwordMismatch']) {
      return 'A confirmação da senha deve ser igual à nova senha.';
    }

    return '';
  }

  protected async submitPasswordChange(): Promise<void> {
    this.passwordSubmitted.set(true);
    this.passwordErrorMessage.set('');
    this.passwordSuccessMessage.set('');

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.passwordSaving.set(true);

    try {
      const value = this.passwordForm.getRawValue();
      await this.authService.changePassword({
        senha_atual: value.senha_atual,
        nova_senha: value.nova_senha,
      });
      this.passwordSuccessMessage.set('Senha atualizada com sucesso.');
      this.passwordForm.reset({
        senha_atual: '',
        nova_senha: '',
        confirmacao_senha: '',
      });
      this.passwordSubmitted.set(false);
      setTimeout(() => this.closePasswordModal(), 900);
    } catch (error) {
      this.passwordErrorMessage.set(processApiError(error));
    } finally {
      this.passwordSaving.set(false);
    }
  }

  protected handleAvatarError(): void {
    this.avatarImageFailed.set(true);
  }

  protected logout(): void {
    this.profileMenuOpen.set(false);
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private async loadCurrentUserProfile(): Promise<void> {
    const session = this.authService.session();
    if (!session?.userId) {
      return;
    }

    if (session.fotoUrl) {
      this.currentUserPhotoUrl.set(session.fotoUrl);
      this.avatarImageFailed.set(false);
    }

    try {
      const user = await this.usuariosService.findById(session.userId);
      if (!user?.foto_url) {
        return;
      }

      this.currentUserPhotoUrl.set(user.foto_url);
      this.avatarImageFailed.set(false);
      this.authService.updateSessionProfile({
        nomeCompleto: user.nome_completo,
        email: user.email,
        fotoUrl: user.foto_url,
      });
    } catch {
      // Mantem fallback para iniciais quando nao houver foto acessivel.
    }
  }
}
