import { Routes } from '@angular/router';

import { adminGuard } from '../../auth/guards/auth.guard';
import { AutorFormPage } from './pages/autor-form/autor-form.page';
import { AutorListPage } from './pages/autor-list/autor-list.page';

export const AUTORES_ROUTES: Routes = [
  {
    path: 'autores',
    canActivate: [adminGuard],
    component: AutorListPage,
  },
  {
    path: 'autores/novo',
    canActivate: [adminGuard],
    component: AutorFormPage,
  },
  {
    path: 'autores/:id/editar',
    canActivate: [adminGuard],
    component: AutorFormPage,
  },
];
