import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../../auth/service/auth.service';
import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly submitted = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    login: ['', Validators.required],
    senha: ['', Validators.required],
  });

  protected hasFieldError(field: 'login' | 'senha'): boolean {
    const control = this.form.controls[field];
    return control.invalid && this.submitted();
  }

  protected getFieldError(field: 'login' | 'senha'): string {
    const control = this.form.controls[field];
    if (control.errors?.['required']) {
      return field === 'login' ? 'Informe o email ou CPF.' : 'Informe a senha.';
    }

    return '';
  }

  protected focusField(input: HTMLInputElement): void {
    queueMicrotask(() => input.focus());
  }

  protected async goToSignup(): Promise<void> {
    await this.router.navigate(['/cadastro']);
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const session = await this.authService.login(this.form.getRawValue());
      this.submitted.set(false);
      await this.router.navigate([session.precisaTrocarSenha ? '/trocar-senha' : '/painel']);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 0) {
          this.errorMessage.set('Nao foi possivel acessar o sistema agora. Tente novamente em instantes.');
          return;
        }
        if (error.status === 401) {
          this.errorMessage.set('Usuario ou senha invalidos.');
          return;
        }
      }

      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
