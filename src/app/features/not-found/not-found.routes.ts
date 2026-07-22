import { Routes } from '@angular/router';

import { NotFoundPage } from './not-found.page';

export const NOT_FOUND_ROUTES: Routes = [
  {
    path: '**',
    component: NotFoundPage,
  },
];
