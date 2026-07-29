import { Routes } from '@angular/router';

import { guestGuard, mustChangePasswordGuard } from '../../auth/guards/auth.guard';
import { AdminEntryPage } from './pages/admin-entry/admin-entry.page';
import { AdminSignupPage } from './pages/admin-signup/admin-signup.page';
import { ChangePasswordPage } from './pages/change-password/change-password.page';
import { LoginPage } from './pages/login/login.page';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    component: AdminEntryPage,
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    component: LoginPage,
  },
  {
    path: 'cadastro',
    component: AdminSignupPage,
  },
  {
    path: 'trocar-senha',
    canActivate: [mustChangePasswordGuard],
    component: ChangePasswordPage,
  },
];
