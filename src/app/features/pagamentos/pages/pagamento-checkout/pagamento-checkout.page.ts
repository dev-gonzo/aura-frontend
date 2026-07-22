import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { digitsOnly, formatCep, formatCpf } from '../../../../core/utils/masks';
import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../../../shared/components/forms/select/form-select.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import {
  PagamentosService,
  PaymentCheckoutResponse,
  PaymentProviderStatus,
  PaymentSettingsResponse,
} from '../../services/pagamentos.service';

type CheckoutField =
  | 'provider'
  | 'external_reference'
  | 'title'
  | 'description'
  | 'quantity'
  | 'unit_price'
  | 'payer_name'
  | 'payer_surname'
  | 'payer_email'
  | 'payer_cpf'
  | 'payer_zip_code';

@Component({
  selector: 'app-pagamento-checkout-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormInputComponent,
    FormSelectComponent,
    ButtonComponent,
  ],
  templateUrl: './pagamento-checkout.page.html',
  styleUrl: './pagamento-checkout.page.css',
})
export class PagamentoCheckoutPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly pagamentosService = inject(PagamentosService);

  protected readonly loading = signal(true);
  protected readonly processing = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly config = signal<PaymentSettingsResponse | null>(null);
  protected readonly providerStatuses = signal<PaymentProviderStatus[]>([]);
  protected readonly checkoutResponse = signal<PaymentCheckoutResponse | null>(null);
  protected readonly providerOptions = computed<FormSelectOption[]>(() => [
    { value: '', label: 'Usar provider padrão' },
    ...this.providerStatuses()
      .filter((provider) => provider.enabled && provider.configured)
      .map((provider) => ({ value: provider.code, label: provider.label })),
  ]);

  protected readonly form = this.formBuilder.nonNullable.group({
    provider: [''],
    external_reference: [''],
    title: ['', Validators.required],
    description: [''],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unit_price: [0, [Validators.required, Validators.min(0.01)]],
    payer_name: [''],
    payer_surname: [''],
    payer_email: ['', Validators.email],
    payer_cpf: [''],
    payer_zip_code: [''],
  });

  protected readonly defaultProviderLabel = computed(() => {
    const config = this.config();
    if (!config) {
      return '';
    }

    const provider = this.providerStatuses().find(
      (current) => current.code === config.default_provider
    );
    return provider?.label || config.default_provider;
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected hasFieldError(field: CheckoutField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected getFieldError(field: CheckoutField): string {
    const control = this.form.controls[field];
    if (!control.invalid || (!control.touched && !this.submitted())) {
      return '';
    }

    if (control.errors?.['required']) {
      switch (field) {
        case 'title':
          return 'Informe o título do item.';
        case 'quantity':
          return 'Informe a quantidade.';
        case 'unit_price':
          return 'Informe o valor do item.';
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

    return '';
  }

  protected formatCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.payer_cpf.setValue(formatCpf(input.value), { emitEvent: false });
  }

  protected formatCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.payer_zip_code.setValue(formatCep(input.value), { emitEvent: false });
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.checkoutResponse.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.processing.set(true);

    try {
      const value = this.form.getRawValue();
      const response = await this.pagamentosService.createCheckout({
        provider: value.provider || undefined,
        external_reference: value.external_reference.trim() || undefined,
        items: [
          {
            title: value.title.trim(),
            description: value.description.trim() || undefined,
            quantity: Number(value.quantity),
            unit_price: Number(value.unit_price),
          },
        ],
        payer: {
          name: value.payer_name.trim() || undefined,
          surname: value.payer_surname.trim() || undefined,
          email: value.payer_email.trim() || undefined,
          cpf: digitsOnly(value.payer_cpf),
          zip_code: digitsOnly(value.payer_zip_code),
        },
      });

      this.checkoutResponse.set(response);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.processing.set(false);
    }
  }

  protected preferredCheckoutUrl(): string {
    const response = this.checkoutResponse();
    if (!response) {
      return '';
    }

    return response.sandbox_checkout_url || response.checkout_url;
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const config = await this.pagamentosService.getConfig();
      this.config.set(config);
      this.providerStatuses.set(config.providers ?? []);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
