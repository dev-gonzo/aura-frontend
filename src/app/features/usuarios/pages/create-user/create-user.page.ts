import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../auth/service/auth.service';
import { digitsOnly, formatCep, formatCpf, formatPhone } from '../../../../core/utils/masks';
import { processApiError } from '../../../../core/utils/process-api-error';
import { maxWordCountValidator } from '../../../../core/validators/max-word-count.validator';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormCheckboxComponent } from '../../../../shared/components/forms/checkbox/form-checkbox.component';
import { ImageUploadComponent } from '../../../../shared/components/forms/image-upload/image-upload.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea/form-textarea.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { UsuarioListItem, UsuariosService } from '../../services/usuarios.service';
import {
  ProcessedUserPhoto,
  processUserPhoto,
} from '../../utils/process-user-photo';

type UserFormField =
  | 'cpf'
  | 'email'
  | 'nome_completo'
  | 'pseudonimo'
  | 'whatsapp'
  | 'data_nascimento'
  | 'nacionalidade'
  | 'senha'
  | 'descricao'
  | 'cep'
  | 'logradouro'
  | 'numero'
  | 'complemento'
  | 'bairro'
  | 'cidade'
  | 'uf';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

@Component({
  selector: 'app-create-user-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FormInputComponent,
    FormTextareaComponent,
    FormCheckboxComponent,
    ImageUploadComponent,
    ButtonComponent,
  ],
  templateUrl: './create-user.page.html',
  styleUrl: './create-user.page.css'
})
export class CreateUserPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly usuariosService = inject(UsuariosService);

  protected readonly loading = signal(false);
  protected readonly processingPhoto = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly serverFieldErrors = signal<Partial<Record<UserFormField, string>>>({});
  protected readonly photoErrorMessage = signal('');
  protected readonly editingUserId = signal<string | null>(null);
  protected readonly editingUser = signal<UsuarioListItem | null>(null);
  protected readonly photoMeta = signal<ProcessedUserPhoto | null>(null);
  protected readonly photoPreviewFailed = signal(false);
  protected readonly searchingCep = signal(false);
  protected readonly cepLookupMessage = signal('');
  protected readonly adminActionLoading = signal(false);
  protected readonly adminActionMessage = signal('');
  protected readonly adminActionError = signal('');
  protected readonly temporaryPassword = signal('');
  private readonly lastSearchedCep = signal('');
  protected readonly isEditMode = computed(() => !!this.editingUserId());
  protected readonly canManageUsers = computed(() => this.authService.isAdmin());
  protected readonly canShowAdminActions = computed(
    () => this.canManageUsers() && this.isEditMode() && !!this.editingUser()
  );
  protected readonly backRoute = computed(() => (this.canManageUsers() ? '/painel/usuarios' : '/painel'));
  protected readonly backLabel = computed(() =>
    this.canManageUsers() ? 'Voltar para usuários' : 'Voltar ao painel'
  );
  protected readonly photoPreview = computed(
    () => this.photoMeta()?.previewUrl ?? this.editingUser()?.foto_url ?? null
  );
  protected readonly shouldShowPhotoPreview = computed(
    () => !!this.photoPreview() && !this.photoPreviewFailed()
  );
  protected readonly form = this.formBuilder.nonNullable.group({
    cpf: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    nome_completo: ['', Validators.required],
    pseudonimo: [''],
    whatsapp: ['', Validators.required],
    data_nascimento: ['', Validators.required],
    nacionalidade: ['', [Validators.maxLength(100)]],
    senha: ['', [Validators.minLength(5)]],
    descricao: ['', [maxWordCountValidator(110)]],
    cep: [''],
    logradouro: [''],
    numero: [''],
    complemento: [''],
    bairro: [''],
    cidade: [''],
    uf: [''],
    role_admin: [false],
    role_editor: [false],
    role_func: [false],
    role_escritor: [false],
  });

  async ngOnInit(): Promise<void> {
    this.watchFieldChanges();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((queryParams) => {
      void this.handleEditingRouteChange(queryParams.get('editar'));
    });
  }

  protected async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.processingPhoto.set(true);
    this.errorMessage.set('');
    this.photoErrorMessage.set('');
    this.photoPreviewFailed.set(false);

    try {
      const processed = await processUserPhoto(file);
      this.photoMeta.set(processed);
    } catch (error) {
      this.photoMeta.set(null);
      this.errorMessage.set(processApiError(error));
    } finally {
      this.processingPhoto.set(false);
      input.value = '';
    }
  }

  protected openPhotoPicker(input: HTMLInputElement): void {
    input.value = '';
    input.click();
  }

  protected formatCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalizedValue = formatCpf(digitsOnly(input.value));
    this.form.controls.cpf.setValue(normalizedValue, { emitEvent: false });
  }

  protected formatWhatsappInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalizedValue = formatPhone(digitsOnly(input.value));
    this.form.controls.whatsapp.setValue(normalizedValue, { emitEvent: false });
  }

  protected formatCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = digitsOnly(input.value).slice(0, 8);
    const normalizedValue = formatCep(digits);
    this.form.controls.cep.setValue(normalizedValue, { emitEvent: false });
    this.cepLookupMessage.set('');

    if (digits.length === 8 && this.lastSearchedCep() !== digits) {
      void this.searchAddressByCep();
    }
  }

  protected async searchAddressByCep(): Promise<void> {
    const cep = digitsOnly(this.form.controls.cep.value).slice(0, 8);
    this.form.controls.cep.setValue(formatCep(cep), { emitEvent: false });
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
        cep: formatCep(cep),
        logradouro: payload.logradouro?.trim() ?? '',
        bairro: payload.bairro?.trim() ?? '',
        cidade: payload.localidade?.trim() ?? '',
        uf: payload.uf?.trim().toUpperCase() ?? '',
      });
    } catch (error) {
      this.lastSearchedCep.set('');
      this.cepLookupMessage.set(extractCepErrorMessage(error));
    } finally {
      this.searchingCep.set(false);
    }
  }

  protected handlePhotoPreviewLoad(): void {
    this.photoPreviewFailed.set(false);
  }

  protected handlePhotoPreviewError(event: Event): void {
    const imageElement = event.target as HTMLImageElement | null;
    const currentPreview = this.photoPreview();
    const failedSource = imageElement?.currentSrc || imageElement?.src || '';

    if (!currentPreview) {
      this.photoPreviewFailed.set(true);
      return;
    }

    if (failedSource && !failedSource.includes(currentPreview)) {
      return;
    }

    this.photoPreviewFailed.set(true);
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.clearServerErrors();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const photo = this.photoMeta();
    if (!photo) {
      this.photoErrorMessage.set('Selecione e processe a foto do usuário antes de salvar.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const value = this.form.getRawValue();
      const roles = this.canManageUsers()
        ? buildRolesFromForm(value)
        : (this.editingUser()?.papeis ?? ['CLIENTE']);

      const hasAddress =
        value.cep || value.logradouro || value.numero || value.bairro || value.cidade || value.uf;

      const payload = {
        cpf: digitsOnly(value.cpf),
        email: value.email,
        nome_completo: value.nome_completo,
        foto: photo.payload,
        descricao: value.descricao,
        pseudonimo: value.pseudonimo,
        endereco_principal: hasAddress
          ? {
              cep: digitsOnly(value.cep),
              logradouro: value.logradouro,
              numero: value.numero,
              complemento: value.complemento,
              bairro: value.bairro,
              cidade: value.cidade,
              uf: value.uf,
            }
          : undefined,
        whatsapp: digitsOnly(value.whatsapp),
        data_nascimento: value.data_nascimento,
        nacionalidade: value.nacionalidade,
        senha: value.senha,
        papeis: roles,
        origem_cadastro: 'EDITORA',
      } as const;

      if (this.isEditMode() && this.editingUserId()) {
        await this.usuariosService.update(this.editingUserId()!, payload);
        this.successMessage.set('Usuário atualizado com sucesso.');
      } else {
        await this.usuariosService.create(payload);
        this.successMessage.set('Usuário criado com sucesso.');
      }

      this.resetForm();
      this.submitted.set(false);
      this.photoMeta.set(null);
      this.cepLookupMessage.set('');
      this.lastSearchedCep.set('');
      await this.router.navigate([this.backRoute()]);
    } catch (error) {
      const message = processApiError(error);
      if (!this.applyServerErrors(message)) {
        this.errorMessage.set(message);
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected getCurrentStatusLabel(): string {
    return this.editingUser()?.status ?? 'Ativo';
  }

  protected getCurrentStatusClass(): string {
    switch (this.editingUser()?.status_codigo) {
      case 'BLOQUEADO':
        return 'is-blocked';
      case 'PENDENTE_APROVACAO':
        return 'is-pending';
      default:
        return 'is-active';
    }
  }

  protected canActivateUser(): boolean {
    return this.editingUser()?.status_codigo !== 'ATIVO';
  }

  protected canBlockUser(): boolean {
    return this.editingUser()?.status_codigo !== 'BLOQUEADO';
  }

  protected async activateUser(): Promise<void> {
    const user = this.editingUser();
    if (!user) {
      return;
    }

    this.adminActionLoading.set(true);
    this.adminActionMessage.set('');
    this.adminActionError.set('');
    this.temporaryPassword.set('');

    try {
      const response = await this.usuariosService.activate(user.id);
      this.applyAdminStatusResponse(response);
      this.adminActionMessage.set('Usuário ativado com sucesso.');
    } catch (error) {
      this.adminActionError.set(processApiError(error));
    } finally {
      this.adminActionLoading.set(false);
    }
  }

  protected async blockUser(): Promise<void> {
    const user = this.editingUser();
    if (!user) {
      return;
    }

    this.adminActionLoading.set(true);
    this.adminActionMessage.set('');
    this.adminActionError.set('');
    this.temporaryPassword.set('');

    try {
      const response = await this.usuariosService.block(user.id);
      this.applyAdminStatusResponse(response);
      this.adminActionMessage.set('Usuário bloqueado com sucesso.');
    } catch (error) {
      this.adminActionError.set(processApiError(error));
    } finally {
      this.adminActionLoading.set(false);
    }
  }

  protected async resetUserPassword(): Promise<void> {
    const user = this.editingUser();
    if (!user) {
      return;
    }

    this.adminActionLoading.set(true);
    this.adminActionMessage.set('');
    this.adminActionError.set('');
    this.temporaryPassword.set('');

    try {
      const response = await this.usuariosService.resetPassword(user.id);
      this.temporaryPassword.set(response.senha_temporaria);
      this.adminActionMessage.set('Senha resetada com sucesso.');
    } catch (error) {
      this.adminActionError.set(processApiError(error));
    } finally {
      this.adminActionLoading.set(false);
    }
  }

  private async loadEditingUser(userId: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const user = await this.usuariosService.findById(userId);
      if (!user) {
        this.errorMessage.set('Usuário não encontrado para edição.');
        return;
      }

      this.editingUser.set(user);
      this.form.patchValue({
        cpf: formatCpf(user.cpf),
        email: user.email,
        nome_completo: user.nome_completo,
        pseudonimo: user.pseudonimo ?? '',
        whatsapp: formatPhone(user.whatsapp),
        data_nascimento: normalizeDateInputValue(user.data_nascimento),
        nacionalidade: user.nacionalidade ?? '',
        descricao: user.descricao ?? '',
        cep: formatCep(user.endereco_principal?.cep ?? ''),
        logradouro: user.endereco_principal?.logradouro ?? '',
        numero: user.endereco_principal?.numero ?? '',
        complemento: user.endereco_principal?.complemento ?? '',
        bairro: user.endereco_principal?.bairro ?? '',
        cidade: user.endereco_principal?.cidade ?? '',
        uf: user.endereco_principal?.uf ?? '',
        role_admin: user.papeis.includes('ADMIN'),
        role_editor: user.papeis.includes('EDITOR'),
        role_func: user.papeis.includes('FUNC'),
        role_escritor: user.papeis.includes('ESCRITOR'),
      });

      if (user.foto && user.foto_url) {
        this.photoPreviewFailed.set(false);
        this.photoMeta.set({
          payload: user.foto,
          previewUrl: user.foto_url,
        });
      } else {
        this.photoPreviewFailed.set(false);
      }
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private async handleEditingRouteChange(editingUserId: string | null): Promise<void> {
    const normalizedId = editingUserId?.trim() || null;
    const currentEditingId = this.editingUserId();

    if (!normalizedId) {
      if (currentEditingId) {
        this.editingUserId.set(null);
        this.editingUser.set(null);
        this.photoMeta.set(null);
        this.photoPreviewFailed.set(false);
        this.resetForm();
        this.errorMessage.set('');
        this.successMessage.set('');
        this.submitted.set(false);
        this.resetAdminActionFeedback();
      }

      this.applyPasswordValidator();
      return;
    }

    if (currentEditingId === normalizedId) {
      this.applyPasswordValidator();
      return;
    }

    this.editingUserId.set(normalizedId);
    this.editingUser.set(null);
    this.photoMeta.set(null);
    this.photoPreviewFailed.set(false);
    this.resetForm();
    this.errorMessage.set('');
    this.successMessage.set('');
    this.submitted.set(false);
    this.resetAdminActionFeedback();
    this.applyPasswordValidator();
    await this.loadEditingUser(normalizedId);
  }

  private resetForm(): void {
    this.form.reset({
      cpf: '',
      email: '',
      nome_completo: '',
      pseudonimo: '',
      whatsapp: '',
      data_nascimento: '',
      nacionalidade: '',
      senha: '',
      descricao: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      role_admin: false,
      role_editor: false,
      role_func: false,
      role_escritor: false,
    });
    this.cepLookupMessage.set('');
    this.lastSearchedCep.set('');
    this.clearServerErrors();
    this.resetAdminActionFeedback();
  }

  private applyPasswordValidator(): void {
    const senhaControl = this.form.controls.senha;
    if (this.isEditMode()) {
      senhaControl.setValidators([Validators.minLength(5)]);
    } else {
      senhaControl.setValidators([Validators.required, Validators.minLength(5)]);
    }

    senhaControl.updateValueAndValidity({ emitEvent: false });
  }

  protected hasFieldError(field: UserFormField): boolean {
    const control = this.form.controls[field];
    return !!this.serverFieldErrors()[field] || (control.invalid && (control.touched || this.submitted()));
  }

  protected getFieldError(field: UserFormField): string {
    const serverError = this.serverFieldErrors()[field];
    if (serverError) {
      return serverError;
    }

    const control = this.form.controls[field];
    if (!control.errors) {
      return '';
    }

    if (control.errors['required']) {
      switch (field) {
        case 'cpf':
          return 'Informe o CPF.';
        case 'email':
          return 'Informe o email.';
        case 'nome_completo':
          return 'Informe o nome completo.';
        case 'whatsapp':
          return 'Informe o WhatsApp.';
        case 'data_nascimento':
          return 'Informe a data de nascimento.';
        case 'senha':
          return this.isEditMode() ? 'Informe uma senha válida.' : 'Informe a senha inicial.';
        default:
          return 'Preencha este campo.';
      }
    }

    if (control.errors['email']) {
      return 'Informe um email válido.';
    }

    if (control.errors['minlength']) {
      return 'O campo deve ter pelo menos 5 caracteres.';
    }

    if (control.errors['maxlength'] && field === 'nacionalidade') {
      return 'A nacionalidade deve ter no maximo 100 caracteres.';
    }

    if (control.errors['maxWords']) {
      return 'A descrição deve ter no máximo 110 palavras.';
    }

    return 'Campo inválido.';
  }

  protected hasPhotoError(): boolean {
    return !!this.photoErrorMessage() || (!this.shouldShowPhotoPreview() && this.submitted());
  }

  protected getPhotoError(): string {
    return this.photoErrorMessage() || 'Selecione e processe a foto do usuário antes de salvar.';
  }

  private watchFieldChanges(): void {
    const watchedFields: UserFormField[] = [
      'cpf',
      'email',
      'nome_completo',
      'pseudonimo',
      'whatsapp',
      'data_nascimento',
      'nacionalidade',
      'senha',
      'descricao',
      'cep',
      'logradouro',
      'numero',
      'complemento',
      'bairro',
      'cidade',
      'uf',
    ];

    for (const field of watchedFields) {
      this.form.controls[field].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.clearServerFieldError(field);
      });
    }
  }

  private clearServerErrors(): void {
    this.serverFieldErrors.set({});
    this.photoErrorMessage.set('');
  }

  private clearServerFieldError(field: UserFormField): void {
    const current = this.serverFieldErrors();
    if (!current[field]) {
      return;
    }

    const next = { ...current };
    delete next[field];
    this.serverFieldErrors.set(next);
  }

  private setServerFieldError(field: UserFormField, message: string): void {
    this.serverFieldErrors.update((current) => ({
      ...current,
      [field]: message,
    }));
  }

  private applyServerErrors(message: string): boolean {
    const normalizedMessage = message.trim().toLowerCase();
    if (!normalizedMessage) {
      return false;
    }

    switch (normalizedMessage) {
      case 'cpf invalido':
        this.setServerFieldError('cpf', 'Informe um CPF válido.');
        return true;
      case 'email invalido':
        this.setServerFieldError('email', 'Informe um email válido.');
        return true;
      case 'cpf ou email ja cadastrado':
        this.setServerFieldError('cpf', 'CPF ou email já cadastrado.');
        this.setServerFieldError('email', 'CPF ou email já cadastrado.');
        return true;
      case 'email ja cadastrado':
        this.setServerFieldError('email', 'Email já cadastrado.');
        return true;
      case 'nome_completo e obrigatorio':
        this.setServerFieldError('nome_completo', 'Informe o nome completo.');
        return true;
      case 'whatsapp invalido':
        this.setServerFieldError('whatsapp', 'Informe um WhatsApp válido.');
        return true;
      case 'data_nascimento deve estar no formato yyyy-mm-dd':
        this.setServerFieldError('data_nascimento', 'Informe uma data de nascimento válida.');
        return true;
      case 'descricao deve ter no maximo 110 palavras':
        this.setServerFieldError('descricao', 'A descrição deve ter no máximo 110 palavras.');
        return true;
      case 'nacionalidade deve ter no maximo 100 caracteres':
        this.setServerFieldError('nacionalidade', 'A nacionalidade deve ter no máximo 100 caracteres.');
        return true;
      case 'senha deve ter pelo menos 5 caracteres':
        this.setServerFieldError('senha', 'A senha deve ter pelo menos 5 caracteres.');
        return true;
      case 'endereco_principal incompleto':
        this.applyAddressErrors();
        return true;
      case 'foto e obrigatoria':
        this.photoErrorMessage.set('Selecione a foto do usuário.');
        return true;
      case 'foto deve estar em image/webp':
      case 'foto deve ter exatamente 1024x1024':
      case 'foto final deve ter no maximo 150 kb':
      case 'foto em base64 invalida':
        this.photoErrorMessage.set(normalizePhotoErrorMessage(normalizedMessage));
        return true;
      default:
        return false;
    }
  }

  private applyAddressErrors(): void {
    const value = this.form.getRawValue();
    let applied = false;

    if (digitsOnly(value.cep).length !== 8) {
      this.setServerFieldError('cep', 'Informe um CEP válido.');
      applied = true;
    }
    if (!value.logradouro.trim()) {
      this.setServerFieldError('logradouro', 'Informe o logradouro.');
      applied = true;
    }
    if (!value.numero.trim()) {
      this.setServerFieldError('numero', 'Informe o número.');
      applied = true;
    }
    if (!value.bairro.trim()) {
      this.setServerFieldError('bairro', 'Informe o bairro.');
      applied = true;
    }
    if (!value.cidade.trim()) {
      this.setServerFieldError('cidade', 'Informe a cidade.');
      applied = true;
    }
    if (value.uf.trim().length !== 2) {
      this.setServerFieldError('uf', 'Informe a UF.');
      applied = true;
    }

    if (!applied) {
      this.setServerFieldError('cep', 'Preencha o Endereço Principal completo.');
    }
  }

  private applyAdminStatusResponse(response: {
    status: string;
    status_codigo: UsuarioListItem['status_codigo'];
    cliente_ativo: boolean;
  }): void {
    this.editingUser.update((current) =>
      current
        ? {
            ...current,
            status: response.status,
            status_codigo: response.status_codigo,
            cliente_ativo: response.cliente_ativo,
          }
        : current
    );
  }

  private resetAdminActionFeedback(): void {
    this.adminActionMessage.set('');
    this.adminActionError.set('');
    this.temporaryPassword.set('');
  }
}

function extractCepErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Não foi possível consultar o CEP.';
}

function normalizePhotoErrorMessage(message: string): string {
  switch (message) {
    case 'foto deve estar em image/webp':
      return 'A foto final precisa estar em formato WebP.';
    case 'foto deve ter exatamente 1024x1024':
      return 'A foto final precisa ter 1024x1024.';
    case 'foto final deve ter no maximo 150 kb':
      return 'A foto final precisa ter no máximo 150 KB.';
    case 'foto em base64 invalida':
      return 'Não foi possível processar a foto enviada.';
    default:
      return 'Revise a foto enviada.';
  }
}

function normalizeDateInputValue(value?: string): string {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/u);
  if (isoMatch) {
    return isoMatch[1];
  }

  const ptBrMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/u);
  if (ptBrMatch) {
    const [, day, month, year] = ptBrMatch;
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

function buildRolesFromForm(value: {
  role_admin: boolean;
  role_editor: boolean;
  role_func: boolean;
  role_escritor: boolean;
}): string[] {
  const roles = ['CLIENTE'];
  if (value.role_admin) roles.push('ADMIN');
  if (value.role_editor) roles.push('EDITOR');
  if (value.role_func) roles.push('FUNC');
  if (value.role_escritor) roles.push('ESCRITOR');
  return roles;
}
