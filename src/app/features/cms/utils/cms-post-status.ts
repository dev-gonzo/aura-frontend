export const CMS_DRAFT_STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'EM_REVISAO', label: 'Em revisão' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REPROVADO', label: 'Reprovado' },
];

export function getCmsDraftStatusLabel(value: string): string {
  switch ((value || '').toUpperCase()) {
    case 'EM_REVISAO':
      return 'Em revisão';
    case 'APROVADO':
      return 'Aprovado';
    case 'REPROVADO':
      return 'Reprovado';
    default:
      return 'Rascunho';
  }
}

export function getCmsDraftStatusClass(value: string): string {
  switch ((value || '').toUpperCase()) {
    case 'EM_REVISAO':
      return 'status-review';
    case 'APROVADO':
      return 'status-approved';
    case 'REPROVADO':
      return 'status-rejected';
    default:
      return 'status-draft';
  }
}

export function getCmsTypeLabel(value: string): string {
  switch ((value || '').toUpperCase()) {
    case 'CONTO':
      return 'Conto';
    case 'ARTIGO':
      return 'Artigo';
    default:
      return 'Blog';
  }
}

