import { Routes } from '@angular/router';

import { adminGuard } from '../../auth/guards/auth.guard';
import { LojaCategoriesPage } from './pages/loja-categories/loja-categories.page';
import { LojaDomainPage } from './pages/loja-domain/loja-domain.page';
import { LojaIntegrationsPage } from './pages/loja-integrations/loja-integrations.page';
import { LojaLayoutPage } from './pages/loja-layout/loja-layout.page';
import { LojaProductFormPage } from './pages/loja-product-form/loja-product-form.page';
import { LojaProductsPage } from './pages/loja-products/loja-products.page';

export const LOJA_ROUTES: Routes = [
  {
    path: 'loja/dominio',
    canActivate: [adminGuard],
    component: LojaDomainPage,
  },
  {
    path: 'loja/layout',
    canActivate: [adminGuard],
    component: LojaLayoutPage,
  },
  {
    path: 'loja/produtos',
    canActivate: [adminGuard],
    component: LojaProductsPage,
  },
  {
    path: 'loja/integracoes',
    canActivate: [adminGuard],
    component: LojaIntegrationsPage,
  },
  {
    path: 'loja/categorias',
    canActivate: [adminGuard],
    component: LojaCategoriesPage,
  },
  {
    path: 'loja/produtos/novo',
    canActivate: [adminGuard],
    component: LojaProductFormPage,
  },
  {
    path: 'loja/produtos/:id',
    canActivate: [adminGuard],
    component: LojaProductFormPage,
  },
];
