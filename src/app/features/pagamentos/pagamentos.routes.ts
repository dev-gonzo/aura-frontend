import { Routes } from '@angular/router';

import { adminGuard } from '../../auth/guards/auth.guard';
import { PagamentoCheckoutPage } from './pages/pagamento-checkout/pagamento-checkout.page';
import { PagamentoConfigPage } from './pages/pagamento-config/pagamento-config.page';

export const PAGAMENTOS_ROUTES: Routes = [
  {
    path: 'pagamentos/checkout',
    canActivate: [adminGuard],
    component: PagamentoCheckoutPage,
  },
  {
    path: 'pagamentos/configuracao',
    canActivate: [adminGuard],
    component: PagamentoConfigPage,
  },
];
