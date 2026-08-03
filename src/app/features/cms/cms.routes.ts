import { Routes } from '@angular/router';

import { editorOrAdminGuard } from '../../auth/guards/auth.guard';
import { CmsPostEditorPage } from './pages/cms-post-editor/cms-post-editor.page';
import { CmsPostListPage } from './pages/cms-post-list/cms-post-list.page';

export const CMS_ROUTES: Routes = [
  {
    path: 'cms/contos',
    canActivate: [editorOrAdminGuard],
    component: CmsPostListPage,
    data: { tipo: 'CONTO' },
  },
  {
    path: 'cms/contos/novo',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'CONTO' },
  },
  {
    path: 'cms/contos/:id/editar',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'CONTO' },
  },
  {
    path: 'cms/artigos',
    canActivate: [editorOrAdminGuard],
    component: CmsPostListPage,
    data: { tipo: 'ARTIGO' },
  },
  {
    path: 'cms/artigos/novo',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'ARTIGO' },
  },
  {
    path: 'cms/artigos/:id/editar',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'ARTIGO' },
  },
  {
    path: 'cms/blog',
    canActivate: [editorOrAdminGuard],
    component: CmsPostListPage,
    data: { tipo: 'BLOG' },
  },
  {
    path: 'cms/blog/novo',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'BLOG' },
  },
  {
    path: 'cms/blog/:id/editar',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'BLOG' },
  },
  {
    path: 'cms/paginas',
    canActivate: [editorOrAdminGuard],
    component: CmsPostListPage,
    data: { tipo: 'PAGINA' },
  },
  {
    path: 'cms/paginas/novo',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'PAGINA' },
  },
  {
    path: 'cms/paginas/:id/editar',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'PAGINA' },
  },
  {
    path: 'cms/landing-produtos',
    canActivate: [editorOrAdminGuard],
    component: CmsPostListPage,
    data: { tipo: 'LANDING_PRODUTOS' },
  },
  {
    path: 'cms/landing-produtos/novo',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'LANDING_PRODUTOS' },
  },
  {
    path: 'cms/landing-produtos/:id/editar',
    canActivate: [editorOrAdminGuard],
    component: CmsPostEditorPage,
    data: { tipo: 'LANDING_PRODUTOS' },
  },
];
