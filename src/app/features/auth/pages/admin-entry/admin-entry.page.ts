import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../../auth/service/auth.service';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';

@Component({
  selector: 'app-admin-entry-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './admin-entry.page.html',
  styleUrl: './admin-entry.page.css',
})
export class AdminEntryPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly primaryRoute = computed(() =>
    this.authService.isAuthenticated() ? '/painel' : '/login'
  );

  protected readonly primaryLabel = computed(() =>
    this.authService.isAuthenticated() ? 'Entrar no painel' : 'Fazer login'
  );

  protected readonly heroBenefits = [
    'Sem taxa de adesão',
    'Venda livros físicos e digitais',
    'Suporte especializado para o mercado editorial',
  ];

  protected readonly navItems = ['Produto', 'Recursos', 'Preços', 'Clientes', 'Blog'];

  protected readonly platformHighlights = [
    {
      icon: 'fa-regular fa-window-maximize',
      title: 'Loja personalizada',
      description:
        'Crie uma vitrine alinhada com a sua identidade para vender livros sem depender de programação.',
    },
    {
      icon: 'fa-solid fa-box-open',
      title: 'Venda de físicos e digitais',
      description:
        'Venda impressos, ebooks e lançamentos no mesmo catálogo com uma operação centralizada.',
    },
    {
      icon: 'fa-regular fa-clock',
      title: 'Pré-venda e lançamentos',
      description:
        'Organize campanhas, janelas de lançamento e novidades com mais controle comercial.',
    },
    {
      icon: 'fa-regular fa-comments',
      title: 'Relacionamento com leitores',
      description:
        'Acompanhe pedidos, clientes e comunicação para manter a operação próxima do seu público.',
    },
    {
      icon: 'fa-solid fa-chart-column',
      title: 'Relatórios que importam',
      description:
        'Tenha visão de vendas, pedidos e desempenho da loja em um painel pensado para o dia a dia editorial.',
    },
  ];

  protected readonly testimonials = [
    {
      quote:
        'A Aura mudou a forma como vendemos nossos livros. A operação ficou mais organizada e o visual finalmente refletiu a nossa marca.',
      author: 'Carolina Mello',
      role: 'Editora Aura',
    },
    {
      quote:
        'Conseguimos lançar novidades com mais velocidade e acompanhar pedidos sem depender de várias ferramentas ao mesmo tempo.',
      author: 'Rafael Nogueira',
      role: 'Autor independente',
    },
    {
      quote:
        'Finalmente uma plataforma feita para quem vive o mercado editorial e precisa de um painel claro para operar.',
      author: 'Editora Inverso',
      role: 'Editora',
    },
  ];

  protected readonly footerColumns = [
    {
      title: 'Produto',
      links: ['Recursos', 'Preços', 'Integrações', 'Roadmap'],
    },
    {
      title: 'Recursos',
      links: ['Venda de livros', 'Marketing', 'Relatórios', 'Personalização'],
    },
    {
      title: 'Empresa',
      links: ['Sobre', 'Blog', 'Contato', 'Trabalhe conosco'],
    },
    {
      title: 'Suporte',
      links: ['Central de ajuda', 'Tutoriais', 'Status', 'Fale conosco'],
    },
  ];

  protected goToPrimaryAction(): void {
    void this.router.navigate([this.primaryRoute()]);
  }

  protected goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  protected goToSignup(): void {
    void this.router.navigate(['/cadastro']);
  }
}
