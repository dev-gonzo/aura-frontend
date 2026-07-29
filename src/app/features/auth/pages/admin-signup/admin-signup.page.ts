import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../auth/service/auth.service';
import { processApiError } from '../../../../core/utils/process-api-error';
import { digitsOnly, formatCpfCnpj, formatPhone } from '../../../../core/utils/masks';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../../../shared/components/forms/select/form-select.component';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea/form-textarea.component';
import { OnboardingRequestService } from '../../services/onboarding-request.service';

@Component({
  selector: 'app-admin-signup-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    FormInputComponent,
    FormSelectComponent,
    FormTextareaComponent,
  ],
  templateUrl: './admin-signup.page.html',
  styleUrl: './admin-signup.page.css',
})
export class AdminSignupPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly onboardingRequestService = inject(OnboardingRequestService);

  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly operationTypeOptions: FormSelectOption[] = [
    { value: 'EDITORA', label: 'Editora' },
    { value: 'AUTOR', label: 'Autor' },
  ];

  protected readonly planOptions: FormSelectOption[] = [
    { value: 'FREE', label: 'Free' },
    { value: 'BASIC', label: 'Basic' },
    { value: 'PREMIUM', label: 'Premium' },
  ];

  protected readonly planCards: PlanCard[] = [
    {
      value: 'FREE',
      label: 'Free',
      price: 'R$ 0',
      subtitle: 'Para começar',
      description: 'Ideal para validar a operação e conhecer a plataforma.',
      highlights: ['Catálogo inicial', 'Painel administrativo', 'Setup rápido'],
    },
    {
      value: 'BASIC',
      label: 'Basic',
      price: 'R$ 79/mês',
      subtitle: 'Para vender com ritmo',
      description: 'Melhor para operações que já querem crescer com mais estrutura.',
      highlights: ['Mais recursos comerciais', 'Acompanhamento de pedidos', 'Operação mais completa'],
    },
    {
      value: 'PREMIUM',
      label: 'Premium',
      price: 'R$ 149/mês',
      subtitle: 'Para escalar',
      description: 'Indicado para quem quer começar com a experiência mais completa.',
      highlights: ['Recursos avançados', 'Prioridade de suporte', 'Base pronta para expansão'],
    },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    tipo_operacao: ['EDITORA', Validators.required],
    plano_inicial: ['BASIC', Validators.required],
    nome_operacao: ['', [Validators.required, Validators.maxLength(255)]],
    dominio: ['', [Validators.required, Validators.maxLength(255)]],
    responsavel_nome: ['', [Validators.required, Validators.maxLength(255)]],
    documento: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    whatsapp: ['', Validators.required],
    data_nascimento: ['', Validators.required],
    senha: ['', [Validators.required, Validators.minLength(5)]],
    confirmar_senha: ['', Validators.required],
    mensagem: ['', Validators.maxLength(600)],
  });

  protected goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  protected goToHome(): void {
    void this.router.navigate(['/']);
  }

  protected hasFieldError(field: FormField): boolean {
    const control = this.form.controls[field];
    return this.submitted() && control.invalid;
  }

  protected getFieldError(field: FormField): string {
    if (!this.hasFieldError(field)) {
      return '';
    }

    const control = this.form.controls[field];

    if (control.errors?.['required']) {
      switch (field) {
        case 'plano_inicial':
          return 'Escolha o plano para começar.';
        case 'nome_operacao':
          return 'Informe o nome da loja.';
        case 'dominio':
          return 'Informe o domínio da loja.';
        case 'responsavel_nome':
          return 'Informe quem vai administrar a conta.';
        case 'documento':
          return 'Informe o CPF do responsável.';
        case 'email':
          return 'Informe o email principal.';
        case 'whatsapp':
          return 'Informe o WhatsApp de contato.';
        case 'data_nascimento':
          return 'Informe a data de nascimento.';
        case 'senha':
          return 'Informe uma senha.';
        case 'confirmar_senha':
          return 'Confirme a senha.';
        default:
          return 'Campo obrigatório.';
      }
    }

    if (control.errors?.['email']) {
      return 'Informe um email válido.';
    }

    if (field === 'senha' && control.errors?.['minlength']) {
      return 'A senha deve ter pelo menos 5 caracteres.';
    }

    if (control.errors?.['maxlength']) {
      return 'Revise o conteúdo deste campo.';
    }

    if (field === 'documento') {
      const digits = digitsOnly(control.value);
      if (digits && digits.length !== 11 && digits.length !== 14) {
        return 'Use um CPF ou CNPJ válido.';
      }
    }

    if (field === 'whatsapp') {
      const digits = digitsOnly(control.value);
      if (digits && (digits.length < 10 || digits.length > 11)) {
        return 'Use um WhatsApp com DDD.';
      }
    }

    if (field === 'confirmar_senha' && this.form.controls.confirmar_senha.value) {
      if (this.form.controls.confirmar_senha.value !== this.form.controls.senha.value) {
        return 'As senhas precisam ser iguais.';
      }
    }

    return '';
  }

  protected handleDocumentoInput(): void {
    const control = this.form.controls.documento;
    control.setValue(formatCpfCnpj(control.value), { emitEvent: false });
  }

  protected handleWhatsappInput(): void {
    const control = this.form.controls.whatsapp;
    control.setValue(formatPhone(control.value), { emitEvent: false });
  }

  protected selectPlan(plan: PlanCard['value']): void {
    this.form.controls.plano_inicial.setValue(plan);
    this.form.controls.plano_inicial.markAsDirty();
    this.form.controls.plano_inicial.markAsTouched();
  }

  protected isPlanSelected(plan: PlanCard['value']): boolean {
    return this.form.controls.plano_inicial.value === plan;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');

    const documento = digitsOnly(this.form.controls.documento.value);
    const whatsApp = digitsOnly(this.form.controls.whatsapp.value);
    const senha = this.form.controls.senha.value.trim();
    const confirmarSenha = this.form.controls.confirmar_senha.value.trim();

    if (documento.length !== 11 && documento.length !== 14) {
      return;
    }

    if (senha !== confirmarSenha) {
      return;
    }

    if (whatsApp.length < 10 || whatsApp.length > 11 || this.form.invalid) {
      return;
    }

    this.loading.set(true);

    try {
      const response = await this.onboardingRequestService.create({
        tipo_operacao: this.form.controls.tipo_operacao.value as 'EDITORA' | 'AUTOR',
        plano_inicial: this.form.controls.plano_inicial.value as 'FREE' | 'BASIC' | 'PREMIUM',
        nome_operacao: this.form.controls.nome_operacao.value,
        dominio: this.form.controls.dominio.value,
        responsavel_nome: this.form.controls.responsavel_nome.value,
        documento,
        email: this.form.controls.email.value,
        whatsapp: whatsApp,
        data_nascimento: this.form.controls.data_nascimento.value,
        senha,
        mensagem: this.form.controls.mensagem.value,
      });

      const session = await this.authService.login({
        login: response.email,
        senha,
      });

      this.submitted.set(false);
      await this.router.navigate([session.precisaTrocarSenha ? '/trocar-senha' : '/painel']);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}

type FormField =
  | 'tipo_operacao'
  | 'plano_inicial'
  | 'nome_operacao'
  | 'dominio'
  | 'responsavel_nome'
  | 'documento'
  | 'email'
  | 'whatsapp'
  | 'data_nascimento'
  | 'senha'
  | 'confirmar_senha'
  | 'mensagem';

type PlanCard = {
  value: 'FREE' | 'BASIC' | 'PREMIUM';
  label: string;
  price: string;
  subtitle: string;
  description: string;
  highlights: string[];
};
