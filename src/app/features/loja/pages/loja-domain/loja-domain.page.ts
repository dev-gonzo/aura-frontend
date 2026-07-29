import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { TenantService } from '../../services/tenant.service';

@Component({
  selector: 'app-loja-domain-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, FormInputComponent, ButtonComponent],
  templateUrl: './loja-domain.page.html',
  styleUrl: './loja-domain.page.css',
})
export class LojaDomainPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly tenantService = inject(TenantService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    dominio: ['', [Validators.required]],
  });

  protected readonly previewPath = computed(() => {
    const domain = (this.form.controls.dominio.value || '').trim();
    return domain ? `/preview/${domain}` : '/preview/seu-dominio';
  });

  protected readonly localPreviewUrl = computed(() => `http://localhost:4202${this.previewPath()}`);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected hasFieldError(field: 'dominio'): boolean {
    const control = this.form.controls[field];
    return this.submitted() && control.invalid;
  }

  protected getFieldError(field: 'dominio'): string {
    if (!this.hasFieldError(field)) {
      return '';
    }
    if (field === 'dominio' && this.form.controls.dominio.hasError('required')) {
      return 'Informe o domínio da sua loja.';
    }
    return 'Campo inválido.';
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.saving.set(false);
      return;
    }

    try {
      await this.tenantService.updateDomain(this.form.controls.dominio.value.trim());
      this.successMessage.set('Domínio salvo. Você já pode testar pela URL temporária.');
      await this.load();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const response = await this.tenantService.getDomain();
      this.form.patchValue({ dominio: response.dominio || '' }, { emitEvent: false });
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
