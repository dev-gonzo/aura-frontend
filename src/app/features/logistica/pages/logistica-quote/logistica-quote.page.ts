import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { digitsOnly, formatCep } from '../../../../core/utils/masks';
import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormCheckboxComponent } from '../../../../shared/components/forms/checkbox/form-checkbox.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import {
  LogisticsProviderStatus,
  LogisticsQuoteOption,
  LogisticsQuoteResponse,
  LogisticsSettingsResponse,
  LogisticaService,
} from '../../services/logistica.service';

type QuoteField =
  | 'cep_destino'
  | 'peso_kg'
  | 'largura_cm'
  | 'altura_cm'
  | 'comprimento_cm'
  | 'valor_declarado';

@Component({
  selector: 'app-logistica-quote-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormInputComponent,
    FormCheckboxComponent,
    ButtonComponent,
  ],
  templateUrl: './logistica-quote.page.html',
  styleUrl: './logistica-quote.page.css',
})
export class LogisticaQuotePage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly logisticaService = inject(LogisticaService);
  private readonly cepValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = digitsOnly(String(control.value ?? ''));
    if (!value) {
      return null;
    }

    return value.length === 8 ? null : { cep: true };
  };

  protected readonly loading = signal(true);
  protected readonly quoting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly providerStatuses = signal<LogisticsProviderStatus[]>([]);
  protected readonly config = signal<LogisticsSettingsResponse | null>(null);
  protected readonly quoteResponse = signal<LogisticsQuoteResponse | null>(null);
  protected readonly providerCards = computed(() =>
    this.providerStatuses().filter((provider) => provider.enabled && provider.configured)
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    provider: [''],
    cep_destino: ['', [Validators.required, this.cepValidator]],
    peso_kg: [0, [Validators.required, Validators.min(0.001)]],
    largura_cm: [0, [Validators.required, Validators.min(0.1)]],
    altura_cm: [0, [Validators.required, Validators.min(0.1)]],
    comprimento_cm: [0, [Validators.required, Validators.min(0.1)]],
    valor_declarado: [0, [Validators.min(0)]],
    recebimento_proprio: [false],
    maos_proprias: [false],
    aviso_recebimento: [false],
  });

  protected readonly originSummary = computed(() => {
    const current = this.config();
    if (!current) {
      return '';
    }

    const parts = [
      current.origin?.name ?? '',
      this.formatAddress(current),
      [current.origin?.city ?? '', current.origin?.state ?? ''].filter(Boolean).join('/'),
      formatCep(current.origin?.cep ?? ''),
    ].filter(Boolean);

    return parts.join(' • ');
  });
  protected readonly selectedProviderLabel = computed(() => {
    const selected = this.form.controls.provider.value;
    if (!selected) {
      return 'Todos os providers habilitados';
    }

    const provider = this.providerStatuses().find((current) => current.code === selected);
    return provider?.label || this.formatProviderName(selected);
  });
  protected readonly quoteOptions = computed(() => {
    const response = this.quoteResponse();
    if (!response) {
      return [];
    }

    return [...response.opcoes].sort((left, right) => {
      if (left.error && !right.error) {
        return 1;
      }
      if (!left.error && right.error) {
        return -1;
      }
      return left.price - right.price;
    });
  });

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  protected formatCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.cep_destino.setValue(formatCep(digitsOnly(input.value).slice(0, 8)), {
      emitEvent: false,
    });
  }

  protected selectProvider(provider: string): void {
    this.form.controls.provider.setValue(provider);
  }

  protected isProviderSelected(provider: string): boolean {
    return this.form.controls.provider.value === provider;
  }

  protected hasFieldError(field: QuoteField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected getFieldError(field: QuoteField): string {
    const control = this.form.controls[field];
    if (!control.invalid || (!control.touched && !this.submitted())) {
      return '';
    }

    if (control.errors?.['required']) {
      switch (field) {
        case 'cep_destino':
          return 'Informe o CEP de destino.';
        case 'peso_kg':
          return 'Informe o peso do pacote.';
        case 'largura_cm':
          return 'Informe a largura do pacote.';
        case 'altura_cm':
          return 'Informe a altura do pacote.';
        case 'comprimento_cm':
          return 'Informe o comprimento do pacote.';
        case 'valor_declarado':
          return 'Informe o valor declarado.';
      }
    }

    if (control.errors?.['cep']) {
      return 'Informe um CEP válido.';
    }

    if (control.errors?.['min']) {
      if (field === 'valor_declarado') {
        return 'O valor declarado não pode ser negativo.';
      }

      return 'Informe um valor maior que zero.';
    }

    return '';
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.quoteResponse.set(null);

    if (!this.config()) {
      this.errorMessage.set('A configuração de logística não foi carregada.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.quoting.set(true);

    try {
      const value = this.form.getRawValue();
      const response = await this.logisticaService.calculateQuote({
        provider: value.provider,
        cep_destino: digitsOnly(value.cep_destino),
        pacote: {
          peso_kg: Number(value.peso_kg),
          largura_cm: Number(value.largura_cm),
          altura_cm: Number(value.altura_cm),
          comprimento_cm: Number(value.comprimento_cm),
        },
        valor_declarado: Number(value.valor_declarado) || 0,
        recebimento_proprio: value.recebimento_proprio,
        maos_proprias: value.maos_proprias,
        aviso_recebimento: value.aviso_recebimento,
      });

      this.quoteResponse.set(response);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.quoting.set(false);
    }
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }

  protected formatProviderLabel(option: LogisticsQuoteOption): string {
    const provider = option.provider ? option.provider.replaceAll('_', ' ') : 'Provider';
    return provider.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
  }

  protected formatProviderName(provider: string): string {
    if (provider === 'MULTI') {
      return 'Todos os providers';
    }
    const normalized = provider ? provider.replaceAll('_', ' ') : 'Provider';
    return normalized.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private async loadInitialData(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const config = await this.logisticaService.getConfig();

      this.config.set(config);
      this.providerStatuses.set(config.providers ?? []);
      this.form.patchValue({
        provider: '',
        cep_destino: '',
        peso_kg: 0,
        largura_cm: 0,
        altura_cm: 0,
        comprimento_cm: 0,
        valor_declarado: 0,
        recebimento_proprio: false,
        maos_proprias: false,
        aviso_recebimento: false,
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.submitted.set(false);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private formatAddress(config: LogisticsSettingsResponse): string {
    const parts = [
      config.origin?.address ?? '',
      config.origin?.number ?? '',
      config.origin?.district ?? '',
    ].filter(Boolean);

    return parts.join(', ');
  }
}
