import { Routes } from '@angular/router';

import { authGuard } from '../../auth/guards/auth.guard';
import { HomePage } from './home.page';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: HomePage,
  },
];
