import { FormSelectOption } from '../../../shared/components/forms/select/form-select.component';

export const EDITAL_STATUS_OPTIONS: FormSelectOption[] = [
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'PUBLICADO', label: 'Publicado' },
  { value: 'ENCERRADO', label: 'Encerrado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function getEditalStatusLabel(status: string): string {
  return EDITAL_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'Rascunho';
}

export function getEditalStatusClass(status: string): string {
  switch (status) {
    case 'PUBLICADO':
      return 'is-published';
    case 'AGENDADO':
      return 'is-scheduled';
    case 'ENCERRADO':
      return 'is-closed';
    case 'CANCELADO':
      return 'is-cancelled';
    default:
      return 'is-draft';
  }
}
