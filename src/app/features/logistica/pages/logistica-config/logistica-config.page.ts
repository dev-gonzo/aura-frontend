import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { digitsOnly, formatCep } from '../../../../core/utils/masks';
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
  LogisticaService,
  LogisticsProviderStatus,
} from '../../services/logistica.service';

type ProviderCode = 'SUPERFRETE' | 'MELHOR_ENVIO' | 'LOGGI' | 'FRENET';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

type LogisticsField =
  | 'default_provider'
  | 'timeout_seconds'
  | 'contact_email'
  | 'origin_name'
  | 'origin_cep'
  | 'origin_address'
  | 'origin_number'
  | 'origin_district'
  | 'origin_city'
  | 'origin_state'
  | 'superfrete_base_url'
  | 'superfrete_token'
  | 'superfrete_user_agent'
  | 'superfrete_services'
  | 'melhor_envio_base_url'
  | 'melhor_envio_access_token'
  | 'melhor_envio_refresh_token'
  | 'melhor_envio_client_id'
  | 'melhor_envio_client_secret'
  | 'melhor_envio_redirect_url'
  | 'melhor_envio_user_agent'
  | 'loggi_base_url'
  | 'loggi_company_id'
  | 'loggi_client_id'
  | 'loggi_client_secret'
  | 'loggi_pickup_type'
  | 'loggi_external_service_id'
  | 'frenet_base_url'
  | 'frenet_token'
  | 'frenet_platform'
  | 'frenet_platform_ver';

@Component({
  selector: 'app-logistica-config-page',
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
  templateUrl: './logistica-config.page.html',
  styleUrl: './logistica-config.page.css',
})
export class LogisticaConfigPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly logisticaService = inject(LogisticaService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly searchingCep = signal(false);
  protected readonly cepLookupMessage = signal('');
  protected readonly serverFieldErrors = signal<Partial<Record<LogisticsField, string>>>({});
  protected readonly providerStatuses = signal<LogisticsProviderStatus[]>([]);
  protected readonly providerPanels = signal<Record<ProviderCode, boolean>>({
    SUPERFRETE: true,
    MELHOR_ENVIO: false,
    LOGGI: false,
    FRENET: false,
  });
  protected readonly updatedAt = signal('');
  protected readonly providerOptions: FormSelectOption[] = [
    { value: 'SUPERFRETE', label: 'SuperFrete' },
    { value: 'MELHOR_ENVIO', label: 'Melhor Envio' },
    { value: 'LOGGI', label: 'Loggi' },
    { value: 'FRENET', label: 'Frenet' },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    default_provider: ['SUPERFRETE', Validators.required],
    timeout_seconds: [15, [Validators.required, Validators.min(5), Validators.max(120)]],
    contact_email: ['', [Validators.required, Validators.email]],
    origin_name: ['Aura Editora', Validators.required],
    origin_cep: ['', Validators.required],
    origin_address: ['', Validators.required],
    origin_number: ['', Validators.required],
    origin_district: ['', Validators.required],
    origin_city: ['', Validators.required],
    origin_state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    superfrete_enabled: [false],
    superfrete_sandbox: [true],
    superfrete_base_url: ['https://sandbox.superfrete.com', Validators.required],
    superfrete_token: ['', Validators.required],
    superfrete_user_agent: ['', Validators.required],
    superfrete_services: ['1,2,17'],
    melhor_envio_enabled: [true],
    melhor_envio_sandbox: [true],
    melhor_envio_base_url: ['https://sandbox.melhorenvio.com.br/api/v2', Validators.required],
    melhor_envio_access_token: ['', Validators.required],
    melhor_envio_refresh_token: [''],
    melhor_envio_client_id: [''],
    melhor_envio_client_secret: [''],
    melhor_envio_redirect_url: [''],
    melhor_envio_user_agent: ['', Validators.required],
    loggi_enabled: [false],
    loggi_sandbox: [true],
    loggi_base_url: ['https://stg.api.loggi.com', Validators.required],
    loggi_company_id: ['', Validators.required],
    loggi_client_id: ['', Validators.required],
    loggi_client_secret: ['', Validators.required],
    loggi_pickup_type: ['', Validators.required],
    loggi_external_service_id: [''],
    frenet_enabled: [false],
    frenet_sandbox: [false],
    frenet_base_url: ['https://api.frenet.com.br', Validators.required],
    frenet_token: ['', Validators.required],
    frenet_platform: ['AURA', Validators.required],
    frenet_platform_ver: ['1.0', Validators.required],
  });

  protected readonly superFreteEnabled = computed(() => this.form.controls.superfrete_enabled.value);
  protected readonly melhorEnvioEnabled = computed(() => this.form.controls.melhor_envio_enabled.value);
  protected readonly loggiEnabled = computed(() => this.form.controls.loggi_enabled.value);
  protected readonly frenetEnabled = computed(() => this.form.controls.frenet_enabled.value);

  async ngOnInit(): Promise<void> {
    this.form.controls.default_provider.valueChanges.subscribe((provider) =>
      this.expandOnlyProvider(provider as ProviderCode)
    );
    this.form.controls.superfrete_enabled.valueChanges.subscribe(() => this.syncSuperFreteControls());
    this.form.controls.melhor_envio_enabled.valueChanges.subscribe(() => this.syncMelhorEnvioControls());
    this.form.controls.loggi_enabled.valueChanges.subscribe(() => this.syncLoggiControls());
    this.form.controls.frenet_enabled.valueChanges.subscribe(() => this.syncFrenetControls());
    this.syncSuperFreteControls();
    this.syncMelhorEnvioControls();
    this.syncLoggiControls();
    this.syncFrenetControls();
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.clearServerErrors();

    try {
      const config = await this.logisticaService.getConfig();
      this.providerStatuses.set(config.providers ?? []);
      this.updatedAt.set(config.updated_at ?? '');
      this.form.reset({
        default_provider: config.default_provider || 'SUPERFRETE',
        timeout_seconds: config.timeout_seconds || 15,
        contact_email: config.contact_email || '',
        origin_name: config.origin?.name || 'Aura Editora',
        origin_cep: formatCep(digitsOnly(config.origin?.cep || '')),
        origin_address: config.origin?.address || '',
        origin_number: config.origin?.number || '',
        origin_district: config.origin?.district || '',
        origin_city: config.origin?.city || '',
        origin_state: (config.origin?.state || '').toUpperCase(),
        superfrete_enabled: config.superfrete_enabled ?? false,
        superfrete_sandbox: config.superfrete?.sandbox ?? true,
        superfrete_base_url: config.superfrete?.base_url || 'https://sandbox.superfrete.com',
        superfrete_token: config.superfrete?.token || '',
        superfrete_user_agent: config.superfrete?.user_agent || '',
        superfrete_services: config.superfrete?.services || '1,2,17',
        melhor_envio_enabled: config.melhor_envio_enabled,
        melhor_envio_sandbox: config.melhor_envio?.sandbox ?? true,
        melhor_envio_base_url:
          config.melhor_envio?.base_url || 'https://sandbox.melhorenvio.com.br/api/v2',
        melhor_envio_access_token: config.melhor_envio?.access_token || '',
        melhor_envio_refresh_token: config.melhor_envio?.refresh_token || '',
        melhor_envio_client_id: config.melhor_envio?.client_id || '',
        melhor_envio_client_secret: config.melhor_envio?.client_secret || '',
        melhor_envio_redirect_url: config.melhor_envio?.redirect_url || '',
        melhor_envio_user_agent: config.melhor_envio?.user_agent || '',
        loggi_enabled: config.loggi_enabled ?? false,
        loggi_sandbox: config.loggi?.sandbox ?? true,
        loggi_base_url: config.loggi?.base_url || 'https://stg.api.loggi.com',
        loggi_company_id: config.loggi?.company_id || '',
        loggi_client_id: config.loggi?.client_id || '',
        loggi_client_secret: config.loggi?.client_secret || '',
        loggi_pickup_type: config.loggi?.pickup_type || '',
        loggi_external_service_id: config.loggi?.external_service_id || '',
        frenet_enabled: config.frenet_enabled ?? false,
        frenet_sandbox: config.frenet?.sandbox ?? false,
        frenet_base_url: config.frenet?.base_url || 'https://api.frenet.com.br',
        frenet_token: config.frenet?.token || '',
        frenet_platform: config.frenet?.platform || 'AURA',
        frenet_platform_ver: config.frenet?.platform_ver || '1.0',
      });
      this.syncSuperFreteControls();
      this.syncMelhorEnvioControls();
      this.syncLoggiControls();
      this.syncFrenetControls();
      this.expandOnlyProvider(this.form.controls.default_provider.value as ProviderCode);
      this.cepLookupMessage.set('');
      this.lastSearchedCep.set(digitsOnly(this.form.controls.origin_cep.value).slice(0, 8));
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.submitted.set(false);
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected formatCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = digitsOnly(input.value).slice(0, 8);
    this.form.controls.origin_cep.setValue(formatCep(digits), { emitEvent: false });
    this.cepLookupMessage.set('');

    if (digits.length === 8 && this.lastSearchedCep() !== digits) {
      void this.searchAddressByCep();
    }
  }

  protected formatStateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.origin_state.setValue(input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2), {
      emitEvent: false,
    });
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
      await this.logisticaService.updateConfig({
        default_provider: value.default_provider,
        timeout_seconds: Number(value.timeout_seconds) || 15,
        contact_email: value.contact_email.trim(),
        origin: {
          name: value.origin_name.trim(),
          cep: digitsOnly(value.origin_cep),
          address: value.origin_address.trim(),
          number: value.origin_number.trim(),
          district: value.origin_district.trim(),
          city: value.origin_city.trim(),
          state: value.origin_state.trim().toUpperCase(),
        },
        superfrete_enabled: value.superfrete_enabled,
        superfrete: {
          sandbox: value.superfrete_sandbox,
          base_url: value.superfrete_base_url.trim(),
          token: value.superfrete_token.trim(),
          user_agent: value.superfrete_user_agent.trim(),
          services: value.superfrete_services.trim(),
        },
        melhor_envio_enabled: value.melhor_envio_enabled,
        melhor_envio: {
          sandbox: value.melhor_envio_sandbox,
          base_url: value.melhor_envio_base_url.trim(),
          access_token: value.melhor_envio_access_token.trim(),
          refresh_token: value.melhor_envio_refresh_token.trim(),
          client_id: value.melhor_envio_client_id.trim(),
          client_secret: value.melhor_envio_client_secret.trim(),
          redirect_url: value.melhor_envio_redirect_url.trim(),
          user_agent: value.melhor_envio_user_agent.trim(),
        },
        loggi_enabled: value.loggi_enabled,
        loggi: {
          sandbox: value.loggi_sandbox,
          base_url: value.loggi_base_url.trim(),
          company_id: value.loggi_company_id.trim(),
          client_id: value.loggi_client_id.trim(),
          client_secret: value.loggi_client_secret.trim(),
          pickup_type: value.loggi_pickup_type.trim(),
          external_service_id: value.loggi_external_service_id.trim(),
        },
        frenet_enabled: value.frenet_enabled,
        frenet: {
          sandbox: value.frenet_sandbox,
          base_url: value.frenet_base_url.trim(),
          token: value.frenet_token.trim(),
          platform: value.frenet_platform.trim(),
          platform_ver: value.frenet_platform_ver.trim(),
        },
      });
      this.successMessage.set('Configuração de logística salva com sucesso.');
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

  protected hasFieldError(field: LogisticsField): boolean {
    if (field === 'origin_cep' && this.cepLookupMessage()) {
      return true;
    }

    if (this.serverFieldErrors()[field]) {
      return true;
    }

    const control = this.getControl(field);
    return control.invalid && (control.touched || this.submitted());
  }

  protected getFieldError(field: LogisticsField): string {
    if (field === 'origin_cep' && this.cepLookupMessage()) {
      return this.cepLookupMessage();
    }

    const serverError = this.serverFieldErrors()[field];
    if (serverError) {
      return serverError;
    }

    const control = this.getControl(field);
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
          return 'Informe o email de contato da logística.';
        case 'origin_name':
          return 'Informe o nome da origem.';
        case 'origin_cep':
          return 'Informe o CEP da origem.';
        case 'origin_address':
          return 'Informe o endereço da origem.';
        case 'origin_number':
          return 'Informe o número da origem.';
        case 'origin_district':
          return 'Informe o bairro da origem.';
        case 'origin_city':
          return 'Informe a cidade da origem.';
        case 'origin_state':
          return 'Informe a UF da origem.';
        case 'superfrete_base_url':
          return 'Informe a base URL do SuperFrete.';
        case 'superfrete_token':
          return 'Informe o token do SuperFrete.';
        case 'superfrete_user_agent':
          return 'Informe o user agent do SuperFrete.';
        case 'superfrete_services':
          return 'Informe os serviços do SuperFrete.';
        case 'melhor_envio_base_url':
          return 'Informe a base URL do Melhor Envio.';
        case 'melhor_envio_access_token':
          return 'Informe o access token do Melhor Envio.';
        case 'melhor_envio_user_agent':
          return 'Informe o user agent do Melhor Envio.';
        case 'loggi_base_url':
          return 'Informe a base URL da Loggi.';
        case 'loggi_company_id':
          return 'Informe o Company ID da Loggi.';
        case 'loggi_client_id':
          return 'Informe o Client ID da Loggi.';
        case 'loggi_client_secret':
          return 'Informe o Client secret da Loggi.';
        case 'loggi_pickup_type':
          return 'Informe o Pickup type da Loggi.';
        case 'frenet_base_url':
          return 'Informe a base URL da Frenet.';
        case 'frenet_token':
          return 'Informe o token da Frenet.';
        case 'frenet_platform':
          return 'Informe a identificação da plataforma na Frenet.';
        case 'frenet_platform_ver':
          return 'Informe a versão da plataforma na Frenet.';
        default:
          return 'Informe este campo.';
      }
    }

    if (control.errors?.['email']) {
      return 'Informe um email válido.';
    }

    if (control.errors?.['min']) {
      return 'O timeout mínimo é de 5 segundos.';
    }

    if (control.errors?.['max']) {
      return 'O timeout máximo é de 120 segundos.';
    }

    if (control.errors?.['minlength'] || control.errors?.['maxlength']) {
      if (field === 'origin_state') {
        return 'Informe uma UF válida com 2 letras.';
      }
    }

    return '';
  }

  protected formatDateTime(value: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected toggleProviderPanel(provider: ProviderCode): void {
    this.providerPanels.update((current) => ({
      ...current,
      [provider]: !current[provider],
    }));
  }

  protected isProviderExpanded(provider: ProviderCode): boolean {
    return this.providerPanels()[provider];
  }

  protected isDefaultProvider(provider: ProviderCode): boolean {
    return this.form.controls.default_provider.value === provider;
  }

  protected isProviderEnabled(provider: ProviderCode): boolean {
    switch (provider) {
      case 'SUPERFRETE':
        return this.form.controls.superfrete_enabled.value;
      case 'MELHOR_ENVIO':
        return this.form.controls.melhor_envio_enabled.value;
      case 'LOGGI':
        return this.form.controls.loggi_enabled.value;
      case 'FRENET':
        return this.form.controls.frenet_enabled.value;
    }
  }

  protected getProviderStatus(provider: ProviderCode): LogisticsProviderStatus | undefined {
    return this.providerStatuses().find((current) => current.code === provider);
  }

  protected async searchAddressByCep(): Promise<void> {
    const cep = digitsOnly(this.form.controls.origin_cep.value).slice(0, 8);
    this.form.controls.origin_cep.setValue(formatCep(cep), { emitEvent: false });
    this.cepLookupMessage.set('');

    if (!cep) {
      this.lastSearchedCep.set('');
      return;
    }

    if (cep.length !== 8) {
      return;
    }

    if (this.searchingCep() || this.lastSearchedCep() === cep) {
      return;
    }

    this.searchingCep.set(true);
    this.lastSearchedCep.set(cep);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) {
        throw new Error('Não foi possível consultar o CEP agora.');
      }

      const payload = (await response.json()) as ViaCepResponse;
      if (payload.erro) {
        this.lastSearchedCep.set('');
        this.cepLookupMessage.set('CEP não encontrado.');
        return;
      }

      this.form.patchValue({
        origin_cep: formatCep(cep),
        origin_address: payload.logradouro?.trim() ?? '',
        origin_district: payload.bairro?.trim() ?? '',
        origin_city: payload.localidade?.trim() ?? '',
        origin_state: payload.uf?.trim().toUpperCase() ?? '',
      });
    } catch (error) {
      this.lastSearchedCep.set('');
      this.cepLookupMessage.set(extractCepErrorMessage(error));
    } finally {
      this.searchingCep.set(false);
    }
  }

  private getControl(field: LogisticsField) {
    switch (field) {
      case 'default_provider':
        return this.form.controls.default_provider;
      case 'timeout_seconds':
        return this.form.controls.timeout_seconds;
      case 'contact_email':
        return this.form.controls.contact_email;
      case 'origin_name':
        return this.form.controls.origin_name;
      case 'origin_cep':
        return this.form.controls.origin_cep;
      case 'origin_address':
        return this.form.controls.origin_address;
      case 'origin_number':
        return this.form.controls.origin_number;
      case 'origin_district':
        return this.form.controls.origin_district;
      case 'origin_city':
        return this.form.controls.origin_city;
      case 'origin_state':
        return this.form.controls.origin_state;
      case 'superfrete_base_url':
        return this.form.controls.superfrete_base_url;
      case 'superfrete_token':
        return this.form.controls.superfrete_token;
      case 'superfrete_user_agent':
        return this.form.controls.superfrete_user_agent;
      case 'superfrete_services':
        return this.form.controls.superfrete_services;
      case 'melhor_envio_base_url':
        return this.form.controls.melhor_envio_base_url;
      case 'melhor_envio_access_token':
        return this.form.controls.melhor_envio_access_token;
      case 'melhor_envio_refresh_token':
        return this.form.controls.melhor_envio_refresh_token;
      case 'melhor_envio_client_id':
        return this.form.controls.melhor_envio_client_id;
      case 'melhor_envio_client_secret':
        return this.form.controls.melhor_envio_client_secret;
      case 'melhor_envio_redirect_url':
        return this.form.controls.melhor_envio_redirect_url;
      case 'melhor_envio_user_agent':
        return this.form.controls.melhor_envio_user_agent;
      case 'loggi_base_url':
        return this.form.controls.loggi_base_url;
      case 'loggi_company_id':
        return this.form.controls.loggi_company_id;
      case 'loggi_client_id':
        return this.form.controls.loggi_client_id;
      case 'loggi_client_secret':
        return this.form.controls.loggi_client_secret;
      case 'loggi_pickup_type':
        return this.form.controls.loggi_pickup_type;
      case 'loggi_external_service_id':
        return this.form.controls.loggi_external_service_id;
      case 'frenet_base_url':
        return this.form.controls.frenet_base_url;
      case 'frenet_token':
        return this.form.controls.frenet_token;
      case 'frenet_platform':
        return this.form.controls.frenet_platform;
      case 'frenet_platform_ver':
        return this.form.controls.frenet_platform_ver;
    }
  }

  private expandOnlyProvider(provider: ProviderCode): void {
    this.providerPanels.set({
      SUPERFRETE: provider === 'SUPERFRETE',
      MELHOR_ENVIO: provider === 'MELHOR_ENVIO',
      LOGGI: provider === 'LOGGI',
      FRENET: provider === 'FRENET',
    });
  }

  private syncSuperFreteControls(): void {
    const enabled = this.form.controls.superfrete_enabled.value;
    const controls = [
      this.form.controls.superfrete_sandbox,
      this.form.controls.superfrete_base_url,
      this.form.controls.superfrete_token,
      this.form.controls.superfrete_user_agent,
      this.form.controls.superfrete_services,
    ];

    for (const control of controls) {
      if (enabled) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  private syncMelhorEnvioControls(): void {
    const enabled = this.form.controls.melhor_envio_enabled.value;
    const controls = [
      this.form.controls.melhor_envio_sandbox,
      this.form.controls.melhor_envio_base_url,
      this.form.controls.melhor_envio_access_token,
      this.form.controls.melhor_envio_refresh_token,
      this.form.controls.melhor_envio_client_id,
      this.form.controls.melhor_envio_client_secret,
      this.form.controls.melhor_envio_redirect_url,
      this.form.controls.melhor_envio_user_agent,
    ];

    for (const control of controls) {
      if (enabled) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  private syncLoggiControls(): void {
    const enabled = this.form.controls.loggi_enabled.value;
    const controls = [
      this.form.controls.loggi_sandbox,
      this.form.controls.loggi_base_url,
      this.form.controls.loggi_company_id,
      this.form.controls.loggi_client_id,
      this.form.controls.loggi_client_secret,
      this.form.controls.loggi_pickup_type,
      this.form.controls.loggi_external_service_id,
    ];

    for (const control of controls) {
      if (enabled) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  private syncFrenetControls(): void {
    const enabled = this.form.controls.frenet_enabled.value;
    const controls = [
      this.form.controls.frenet_sandbox,
      this.form.controls.frenet_base_url,
      this.form.controls.frenet_token,
      this.form.controls.frenet_platform,
      this.form.controls.frenet_platform_ver,
    ];

    for (const control of controls) {
      if (enabled) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  private clearServerErrors(): void {
    this.serverFieldErrors.set({});
  }

  private applyServerErrors(message: string): boolean {
    const normalized = message.toLowerCase();
    const errors: Partial<Record<LogisticsField, string>> = {};

    if (normalized.includes('email de contato')) {
      errors.contact_email = message;
    } else if (normalized.includes('cep de origem')) {
      errors.origin_cep = message;
    } else if (normalized.includes('endereco de origem')) {
      errors.origin_address = message;
    } else if (normalized.includes('numero do endereco')) {
      errors.origin_number = message;
    } else if (normalized.includes('bairro de origem')) {
      errors.origin_district = message;
    } else if (normalized.includes('cidade de origem')) {
      errors.origin_city = message;
    } else if (normalized.includes('uf de origem')) {
      errors.origin_state = message;
    } else if (normalized.includes('provider padrao')) {
      errors.default_provider = message;
    } else if (normalized.includes('base url do superfrete')) {
      errors.superfrete_base_url = message;
    } else if (normalized.includes('token do superfrete')) {
      errors.superfrete_token = message;
    } else if (normalized.includes('user agent do superfrete')) {
      errors.superfrete_user_agent = message;
    } else if (normalized.includes('servicos do superfrete')) {
      errors.superfrete_services = message;
    } else if (normalized.includes('base url do melhor envio')) {
      errors.melhor_envio_base_url = message;
    } else if (normalized.includes('access token do melhor envio')) {
      errors.melhor_envio_access_token = message;
    } else if (normalized.includes('user agent do melhor envio')) {
      errors.melhor_envio_user_agent = message;
    } else if (normalized.includes('base url da loggi')) {
      errors.loggi_base_url = message;
    } else if (normalized.includes('company id da loggi')) {
      errors.loggi_company_id = message;
    } else if (normalized.includes('client id da loggi')) {
      errors.loggi_client_id = message;
    } else if (normalized.includes('client secret da loggi')) {
      errors.loggi_client_secret = message;
    } else if (normalized.includes('pickup type')) {
      errors.loggi_pickup_type = message;
    } else if (normalized.includes('external service id da loggi')) {
      errors.loggi_external_service_id = message;
    } else if (normalized.includes('base url da frenet')) {
      errors.frenet_base_url = message;
    } else if (normalized.includes('token da frenet')) {
      errors.frenet_token = message;
    } else if (normalized.includes('plataforma na frenet')) {
      errors.frenet_platform = message;
    } else if (normalized.includes('versao da plataforma na frenet')) {
      errors.frenet_platform_ver = message;
    }

    if (!Object.keys(errors).length) {
      return false;
    }

    this.serverFieldErrors.set(errors);
    return true;
  }

  private readonly lastSearchedCep = signal('');
}

function extractCepErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Não foi possível consultar o CEP.';
}
