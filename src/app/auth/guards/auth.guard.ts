import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../service/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (await authService.ensureAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!(await authService.ensureAuthenticated())) {
    return true;
  }

  if (authService.mustChangePassword()) {
    return router.createUrlTree(['/trocar-senha']);
  }

  return router.createUrlTree(['/painel']);
};

export const mustChangePasswordGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!(await authService.ensureAuthenticated())) {
    return router.createUrlTree(['/login']);
  }

  if (authService.mustChangePassword()) {
    return true;
  }

  return router.createUrlTree(['/painel']);
};

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!(await authService.ensureAuthenticated())) {
    return router.createUrlTree(['/login']);
  }

  if (authService.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/painel']);
};

export const userCreateOrSelfEditGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!(await authService.ensureAuthenticated())) {
    return router.createUrlTree(['/login']);
  }

  const session = authService.session();
  if (!session) {
    return router.createUrlTree(['/login']);
  }

  if (authService.isAdmin()) {
    return true;
  }

  const editingId = route.queryParamMap.get('editar');
  if (editingId && editingId === session.userId) {
    return true;
  }

  return router.createUrlTree(['/painel']);
};
