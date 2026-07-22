import { Routes } from '@angular/router';

import { adminGuard } from '../../auth/guards/auth.guard';
import { EditalDetailPage } from './pages/edital-detail/edital-detail.page';
import { EditalFormPage } from './pages/edital-form/edital-form.page';
import { EditalListPage } from './pages/edital-list/edital-list.page';

export const EDITAIS_ROUTES: Routes = [
  {
    path: 'editais',
    canActivate: [adminGuard],
    component: EditalListPage,
  },
  {
    path: 'editais/novo',
    canActivate: [adminGuard],
    component: EditalFormPage,
  },
  {
    path: 'editais/:id',
    canActivate: [adminGuard],
    component: EditalDetailPage,
  },
  {
    path: 'editais/:id/editar',
    canActivate: [adminGuard],
    component: EditalFormPage,
  },
];
