import { Routes } from '@angular/router';

import { adminGuard } from '../../auth/guards/auth.guard';
import { LogisticaConfigPage } from './pages/logistica-config/logistica-config.page';
import { LogisticaQuotePage } from './pages/logistica-quote/logistica-quote.page';

export const LOGISTICA_ROUTES: Routes = [
  {
    path: 'logistica/cotacao',
    canActivate: [adminGuard],
    component: LogisticaQuotePage,
  },
  {
    path: 'logistica/configuracao',
    canActivate: [adminGuard],
    component: LogisticaConfigPage,
  },
];
