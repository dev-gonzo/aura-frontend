import { Routes } from '@angular/router';

import { AUTH_ROUTES } from './features/auth/auth.routes';
import { AUTORES_ROUTES } from './features/autores/autores.routes';
import { CMS_ROUTES } from './features/cms/cms.routes';
import { EDITAIS_ROUTES } from './features/editais/editais.routes';
import { LIVROS_ROUTES } from './features/livros/livros.routes';
import { LOJA_ROUTES } from './features/loja/loja.routes';
import { LOGISTICA_ROUTES } from './features/logistica/logistica.routes';
import { PAGAMENTOS_ROUTES } from './features/pagamentos/pagamentos.routes';
import { PEDIDOS_ROUTES } from './features/pedidos/pedidos.routes';
import { adminGuard, authGuard, userCreateOrSelfEditGuard } from './auth/guards/auth.guard';
import { HomePage } from './features/home/home.page';
import { NOT_FOUND_ROUTES } from './features/not-found/not-found.routes';
import { CreateUserPage } from './features/usuarios/pages/create-user/create-user.page';
import { UserListPage } from './features/usuarios/pages/user-list/user-list.page';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';

export const routes: Routes = [
  ...AUTH_ROUTES,
  {
    path: 'painel',
    canActivate: [authGuard],
    component: AuthLayoutComponent,
    children: [
      {
        path: '',
        component: HomePage,
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        component: UserListPage,
      },
      ...AUTORES_ROUTES,
      ...CMS_ROUTES,
      ...LIVROS_ROUTES,
      ...LOJA_ROUTES,
      ...LOGISTICA_ROUTES,
      ...PAGAMENTOS_ROUTES,
      ...PEDIDOS_ROUTES,
      ...EDITAIS_ROUTES,
      {
        path: 'usuarios/novo',
        canActivate: [userCreateOrSelfEditGuard],
        component: CreateUserPage,
      },
    ],
  },
  ...NOT_FOUND_ROUTES,
];
