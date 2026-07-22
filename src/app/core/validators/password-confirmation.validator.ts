import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordConfirmationValidator: ValidatorFn = (
  group: AbstractControl
): ValidationErrors | null => {
  const newPassword = String(group.get('nova_senha')?.value ?? '');
  const confirmation = String(group.get('confirmacao_senha')?.value ?? '');

  if (!newPassword || !confirmation) {
    return null;
  }

  return newPassword === confirmation ? null : { passwordMismatch: true };
};
