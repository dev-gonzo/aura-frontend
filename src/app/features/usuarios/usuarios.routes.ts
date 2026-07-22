import { Routes } from '@angular/router';

import { authGuard } from '../../auth/guards/auth.guard';
import { CreateUserPage } from './pages/create-user/create-user.page';
import { UserListPage } from './pages/user-list/user-list.page';

export const USUARIOS_ROUTES: Routes = [
  {
    path: 'usuarios',
    canActivate: [authGuard],
    component: UserListPage,
  },
  {
    path: 'usuarios/novo',
    canActivate: [authGuard],
    component: CreateUserPage,
  },
];
