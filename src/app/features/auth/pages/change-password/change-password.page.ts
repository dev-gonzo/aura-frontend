import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../auth/service/auth.service';
import { processApiError } from '../../../../core/utils/process-api-error';
import { passwordConfirmationValidator } from '../../../../core/validators/password-confirmation.validator';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { ChangePasswordFieldsComponent } from '../../components/change-password-fields/change-password-fields.component';

@Component({
  selector: 'app-change-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChangePasswordFieldsComponent, ButtonComponent],
  templateUrl: './change-password.page.html',
  styleUrl: './change-password.page.css'
})
export class ChangePasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly submitted = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      senha_atual: ['', Validators.required],
      nova_senha: ['', [Validators.required, Validators.minLength(5)]],
      confirmacao_senha: ['', Validators.required],
    },
    {
      validators: passwordConfirmationValidator,
    }
  );

  protected readonly hasFieldErrorFn = (
    field: 'senha_atual' | 'nova_senha' | 'confirmacao_senha'
  ): boolean => this.hasFieldError(field);

  protected readonly getFieldErrorFn = (
    field: 'senha_atual' | 'nova_senha' | 'confirmacao_senha'
  ): string => this.getFieldError(field);

  protected hasFieldError(field: 'senha_atual' | 'nova_senha' | 'confirmacao_senha'): boolean {
    const control = this.form.controls[field];
    const hasMismatch = field === 'confirmacao_senha' && !!this.form.errors?.['passwordMismatch'];
    return (control.invalid || hasMismatch) && (control.touched || this.submitted());
  }

  protected getFieldError(field: 'senha_atual' | 'nova_senha' | 'confirmacao_senha'): string {
    const control = this.form.controls[field];
    if (control.errors?.['required']) {
      switch (field) {
        case 'senha_atual':
          return 'Informe a senha atual.';
        case 'nova_senha':
          return 'Informe a nova senha.';
        default:
          return 'Confirme a nova senha.';
      }
    }

    if (control.errors?.['minlength']) {
      return 'A nova senha deve ter pelo menos 5 caracteres.';
    }

    if (field === 'confirmacao_senha' && this.form.errors?.['passwordMismatch']) {
      return 'A confirmação da senha deve ser igual à nova senha.';
    }

    return '';
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.message.set('');

    try {
      const value = this.form.getRawValue();
      await this.authService.changePassword({
        senha_atual: value.senha_atual,
        nova_senha: value.nova_senha,
      });
      this.message.set('Senha atualizada com sucesso.');
      this.submitted.set(false);
      await this.router.navigate(['/painel']);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
