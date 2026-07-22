import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

import { AuthService } from '../../auth/service/auth.service';
import { PageHeaderComponent } from '../../shared/components/layout/page-header/page-header.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage {
  private readonly authService = inject(AuthService);

  protected readonly currentUserName = computed(
    () => this.authService.session()?.nomeCompleto ?? 'Usuário autenticado'
  );
  protected readonly currentUserEmail = computed(() => this.authService.session()?.email ?? '-');
  protected readonly currentUserRoles = computed(
    () => this.authService.session()?.papeis.join(', ') ?? '-'
  );
  protected readonly metricCards = [
    {
      title: 'Receita Editorial',
      value: 'R$ 2,9 mi',
      description: '+12,5% vs. último mês',
      accent: '#4f46e5',
    },
    {
      title: 'Usuários Ativos',
      value: '86.412',
      description: '+8,2% nesta semana',
      accent: '#10b981',
    },
    {
      title: 'Pedidos',
      value: '6.465',
      description: '-2,1% desde ontem',
      accent: '#f59e0b',
    },
    {
      title: 'Conversão',
      value: '12,15%',
      description: '+0,3% no mês',
      accent: '#0ea5e9',
    },
  ];
  protected readonly activeRules = [
    'CPF e email únicos para cada usuário.',
    'Cliente é perfil obrigatório em todos os cadastros.',
    'Senha inicial de cadastros internos exige troca no primeiro acesso.',
    'Mudanças cadastrais serão aprovadas por ADMIN ou EDITOR.',
  ];
  protected readonly deviceStats = [
    { label: 'Desktop', value: '45,8%', color: '#4f46e5' },
    { label: 'Mobile', value: '38,7%', color: '#10b981' },
    { label: 'Tablet', value: '15,5%', color: '#f59e0b' },
  ];
  protected readonly pipeline = [
    { title: 'Cadastros pendentes', value: '18', detail: 'Aguardando aprovação editorial' },
    { title: 'Editais ativos', value: '07', detail: 'Publicações abertas e em análise' },
    { title: 'Livros em produção', value: '24', detail: 'Metadados e ISBN em preparação' },
  ];
}
