import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormCheckboxComponent } from '../../../../shared/components/forms/checkbox/form-checkbox.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../../../shared/components/forms/select/form-select.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import {
  PagamentosService,
  PaymentProviderStatus,
} from '../../services/pagamentos.service';

type ProviderCode = 'MERCADO_PAGO';

type PaymentField =
  | 'default_provider'
  | 'timeout_seconds'
  | 'contact_email'
  | 'mercado_pago_base_url'
  | 'mercado_pago_public_key'
  | 'mercado_pago_access_token'
  | 'mercado_pago_statement_descriptor'
  | 'mercado_pago_success_url'
  | 'mercado_pago_failure_url'
  | 'mercado_pago_pending_url'
  | 'mercado_pago_webhook_url'
  | 'mercado_pago_installments';

@Component({
  selector: 'app-pagamento-config-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormInputComponent,
    FormSelectComponent,
    FormCheckboxComponent,
    ButtonComponent,
  ],
  templateUrl: './pagamento-config.page.html',
  styleUrl: './pagamento-config.page.css',
})
export class PagamentoConfigPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly pagamentosService = inject(PagamentosService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly serverFieldErrors = signal<Partial<Record<PaymentField, string>>>({});
  protected readonly providerStatuses = signal<PaymentProviderStatus[]>([]);
  protected readonly providerPanels = signal<Record<ProviderCode, boolean>>({
    MERCADO_PAGO: true,
  });
  protected readonly updatedAt = signal('');
  protected readonly providerOptions: FormSelectOption[] = [
    { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    default_provider: ['MERCADO_PAGO', Validators.required],
    timeout_seconds: [15, [Validators.required, Validators.min(5), Validators.max(120)]],
    contact_email: ['', [Validators.required, Validators.email]],
    mercado_pago_enabled: [true],
    mercado_pago_sandbox: [true],
    mercado_pago_base_url: ['https://api.mercadopago.com', Validators.required],
    mercado_pago_public_key: ['', Validators.required],
    mercado_pago_access_token: ['', Validators.required],
    mercado_pago_statement_descriptor: ['AURA'],
    mercado_pago_success_url: [''],
    mercado_pago_failure_url: [''],
    mercado_pago_pending_url: [''],
    mercado_pago_webhook_url: [''],
    mercado_pago_binary_mode: [false],
    mercado_pago_wallet_purchase: [false],
    mercado_pago_installments: [12, [Validators.required, Validators.min(1), Validators.max(24)]],
  });

  protected readonly mercadoPagoEnabled = computed(() => this.form.controls.mercado_pago_enabled.value);

  async ngOnInit(): Promise<void> {
    this.form.controls.mercado_pago_enabled.valueChanges.subscribe(() =>
      this.syncMercadoPagoControls()
    );
    this.syncMercadoPagoControls();
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.clearServerErrors();

    try {
      const config = await this.pagamentosService.getConfig();
      this.providerStatuses.set(config.providers ?? []);
      this.updatedAt.set(config.updated_at ?? '');
      this.form.reset({
        default_provider: config.default_provider || 'MERCADO_PAGO',
        timeout_seconds: config.timeout_seconds || 15,
        contact_email: config.contact_email || '',
        mercado_pago_enabled: config.mercado_pago_enabled ?? true,
        mercado_pago_sandbox: config.mercado_pago?.sandbox ?? true,
        mercado_pago_base_url: config.mercado_pago?.base_url || 'https://api.mercadopago.com',
        mercado_pago_public_key: config.mercado_pago?.public_key || '',
        mercado_pago_access_token: config.mercado_pago?.access_token || '',
        mercado_pago_statement_descriptor: config.mercado_pago?.statement_descriptor || 'AURA',
        mercado_pago_success_url: config.mercado_pago?.success_url || '',
        mercado_pago_failure_url: config.mercado_pago?.failure_url || '',
        mercado_pago_pending_url: config.mercado_pago?.pending_url || '',
        mercado_pago_webhook_url: config.mercado_pago?.webhook_url || '',
        mercado_pago_binary_mode: config.mercado_pago?.binary_mode ?? false,
        mercado_pago_wallet_purchase: config.mercado_pago?.wallet_purchase ?? false,
        mercado_pago_installments: config.mercado_pago?.installments || 12,
      });
      this.syncMercadoPagoControls();
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.submitted.set(false);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.clearServerErrors();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    try {
      const value = this.form.getRawValue();
      await this.pagamentosService.updateConfig({
        default_provider: value.default_provider,
        timeout_seconds: Number(value.timeout_seconds),
        contact_email: value.contact_email.trim(),
        mercado_pago_enabled: value.mercado_pago_enabled,
        mercado_pago: {
          sandbox: value.mercado_pago_sandbox,
          base_url: value.mercado_pago_base_url.trim(),
          public_key: value.mercado_pago_public_key.trim(),
          access_token: value.mercado_pago_access_token.trim(),
          statement_descriptor: value.mercado_pago_statement_descriptor.trim(),
          success_url: value.mercado_pago_success_url.trim(),
          failure_url: value.mercado_pago_failure_url.trim(),
          pending_url: value.mercado_pago_pending_url.trim(),
          webhook_url: value.mercado_pago_webhook_url.trim(),
          binary_mode: value.mercado_pago_binary_mode,
          wallet_purchase: value.mercado_pago_wallet_purchase,
          installments: Number(value.mercado_pago_installments),
        },
      });

      this.successMessage.set('Configuração de pagamentos salva com sucesso.');
      await this.load();
    } catch (error) {
      const message = processApiError(error);
      if (!this.applyServerErrors(message)) {
        this.errorMessage.set(message);
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected hasFieldError(field: PaymentField): boolean {
    if (this.serverFieldErrors()[field]) {
      return true;
    }

    const control = this.resolveControl(field);
    return control.invalid && (control.touched || this.submitted());
  }

  protected getFieldError(field: PaymentField): string {
    const serverError = this.serverFieldErrors()[field];
    if (serverError) {
      return serverError;
    }

    const control = this.resolveControl(field);
    if (!control.invalid || (!control.touched && !this.submitted())) {
      return '';
    }

    if (control.errors?.['required']) {
      switch (field) {
        case 'default_provider':
          return 'Selecione o provider padrão.';
        case 'timeout_seconds':
          return 'Informe o timeout da integração.';
        case 'contact_email':
          return 'Informe o email de contato.';
        case 'mercado_pago_base_url':
          return 'Informe a base URL do Mercado Pago.';
        case 'mercado_pago_public_key':
          return 'Informe a public key do Mercado Pago.';
        case 'mercado_pago_access_token':
          return 'Informe o access token do Mercado Pago.';
        case 'mercado_pago_installments':
          return 'Informe o número máximo de parcelas.';
        default:
          return 'Preencha este campo.';
      }
    }

    if (control.errors?.['email']) {
      return 'Informe um email válido.';
    }

    if (control.errors?.['min']) {
      return 'Informe um valor maior que zero.';
    }

    if (control.errors?.['max']) {
      return 'Informe um valor dentro do limite permitido.';
    }

    return '';
  }

  protected isProviderExpanded(provider: ProviderCode): boolean {
    return !!this.providerPanels()[provider];
  }

  protected toggleProviderPanel(provider: ProviderCode): void {
    this.providerPanels.update((current) => ({
      ...current,
      [provider]: !current[provider],
    }));
  }

  protected isDefaultProvider(provider: ProviderCode): boolean {
    return this.form.controls.default_provider.value === provider;
  }

  protected isProviderEnabled(provider: ProviderCode): boolean {
    const status = this.providerStatuses().find((current) => current.code === provider);
    return status?.enabled ?? this.form.controls.mercado_pago_enabled.value;
  }

  protected getProviderStatus(provider: ProviderCode): PaymentProviderStatus | undefined {
    return this.providerStatuses().find((current) => current.code === provider);
  }

  private syncMercadoPagoControls(): void {
    const enabled = this.form.controls.mercado_pago_enabled.value;
    const controls = [
      this.form.controls.mercado_pago_sandbox,
      this.form.controls.mercado_pago_base_url,
      this.form.controls.mercado_pago_public_key,
      this.form.controls.mercado_pago_access_token,
      this.form.controls.mercado_pago_statement_descriptor,
      this.form.controls.mercado_pago_success_url,
      this.form.controls.mercado_pago_failure_url,
      this.form.controls.mercado_pago_pending_url,
      this.form.controls.mercado_pago_webhook_url,
      this.form.controls.mercado_pago_binary_mode,
      this.form.controls.mercado_pago_wallet_purchase,
      this.form.controls.mercado_pago_installments,
    ];

    for (const control of controls) {
      if (enabled) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  private resolveControl(field: PaymentField) {
    switch (field) {
      case 'default_provider':
        return this.form.controls.default_provider;
      case 'timeout_seconds':
        return this.form.controls.timeout_seconds;
      case 'contact_email':
        return this.form.controls.contact_email;
      case 'mercado_pago_base_url':
        return this.form.controls.mercado_pago_base_url;
      case 'mercado_pago_public_key':
        return this.form.controls.mercado_pago_public_key;
      case 'mercado_pago_access_token':
        return this.form.controls.mercado_pago_access_token;
      case 'mercado_pago_statement_descriptor':
        return this.form.controls.mercado_pago_statement_descriptor;
      case 'mercado_pago_success_url':
        return this.form.controls.mercado_pago_success_url;
      case 'mercado_pago_failure_url':
        return this.form.controls.mercado_pago_failure_url;
      case 'mercado_pago_pending_url':
        return this.form.controls.mercado_pago_pending_url;
      case 'mercado_pago_webhook_url':
        return this.form.controls.mercado_pago_webhook_url;
      case 'mercado_pago_installments':
        return this.form.controls.mercado_pago_installments;
    }
  }

  private clearServerErrors(): void {
    this.serverFieldErrors.set({});
  }

  private applyServerErrors(message: string): boolean {
    const normalized = message.toLowerCase();
    const errors: Partial<Record<PaymentField, string>> = {};

    if (normalized.includes('email de contato')) {
      errors.contact_email = message;
    }
    if (normalized.includes('base url')) {
      errors.mercado_pago_base_url = message;
    }
    if (normalized.includes('public key')) {
      errors.mercado_pago_public_key = message;
    }
    if (normalized.includes('access token')) {
      errors.mercado_pago_access_token = message;
    }
    if (normalized.includes('parcel')) {
      errors.mercado_pago_installments = message;
    }

    if (Object.keys(errors).length === 0) {
      return false;
    }

    this.serverFieldErrors.set(errors);
    return true;
  }
}
