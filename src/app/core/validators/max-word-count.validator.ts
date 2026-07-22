import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function maxWordCountValidator(limit: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }

    const words = value.split(/\s+/).length;
    return words > limit ? { maxWords: { limit, actual: words } } : null;
  };
}
