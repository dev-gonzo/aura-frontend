import { Routes } from '@angular/router';

import { guestGuard, mustChangePasswordGuard } from '../../auth/guards/auth.guard';
import { ChangePasswordPage } from './pages/change-password/change-password.page';
import { LoginPage } from './pages/login/login.page';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    component: LoginPage,
  },
  {
    path: 'trocar-senha',
    canActivate: [mustChangePasswordGuard],
    component: ChangePasswordPage,
  },
];
