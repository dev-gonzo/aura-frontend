import { Routes } from '@angular/router';

import { adminGuard } from '../../auth/guards/auth.guard';
import { LivroFormPage } from './pages/livro-form/livro-form.page';
import { LivroListPage } from './pages/livro-list/livro-list.page';

export const LIVROS_ROUTES: Routes = [
  {
    path: 'livros',
    canActivate: [adminGuard],
    component: LivroListPage,
  },
  {
    path: 'livros/novo',
    canActivate: [adminGuard],
    component: LivroFormPage,
  },
  {
    path: 'livros/:id/editar',
    canActivate: [adminGuard],
    component: LivroFormPage,
  },
];
