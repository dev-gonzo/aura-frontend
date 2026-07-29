import { Routes } from '@angular/router';

import { adminGuard } from '../../auth/guards/auth.guard';
import { PedidoDetailPage } from './pages/pedido-detail/pedido-detail.page';
import { PedidoListPage } from './pages/pedido-list/pedido-list.page';

export const PEDIDOS_ROUTES: Routes = [
  {
    path: 'pedidos',
    canActivate: [adminGuard],
    component: PedidoListPage,
  },
  {
    path: 'pedidos/:id',
    canActivate: [adminGuard],
    component: PedidoDetailPage,
  },
];
