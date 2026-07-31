import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent],
  templateUrl: './forgot-password.page.html',
  styleUrl: './forgot-password.page.css'
})
export class ForgotPasswordPage {
  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly success = signal(false);

  protected readonly form = new FormBuilder().nonNullable.group({
    login: ['', Validators.required],
  });

  protected hasFieldError(): boolean {
    return this.form.controls.login.invalid && this.submitted();
  }

  protected getFieldError(): string {
    if (this.form.controls.login.errors?.['required']) {
      return 'Informe o email ou CPF.';
    }
    return '';
  }

  protected focusField(input: HTMLInputElement): void {
    queueMicrotask(() => input.focus());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    try {
      this.success.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
