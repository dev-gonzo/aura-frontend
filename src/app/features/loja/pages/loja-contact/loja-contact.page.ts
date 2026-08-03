import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { digitsOnly, formatCnpj, formatPhone } from '../../../../core/utils/masks';
import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea/form-textarea.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { LojaService, StoreContactSettingsPayload, StoreSettingsResponse } from '../../services/loja.service';
import { TenantService } from '../../services/tenant.service';

@Component({
  selector: 'app-loja-contact-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FormInputComponent,
    FormTextareaComponent,
    ButtonComponent,
  ],
  templateUrl: './loja-contact.page.html',
  styleUrl: './loja-contact.page.css',
})
export class LojaContactPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly lojaService = inject(LojaService);
  private readonly tenantService = inject(TenantService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly tenantDomain = signal('localhost');
  private readonly currentConfig = signal<StoreSettingsResponse | null>(null);

  protected readonly previewUrl = computed(() => {
    const hostname = globalThis.location?.hostname || 'localhost';
    const domain = (this.tenantDomain() || 'localhost').trim() || 'localhost';
    return `http://${hostname}:4202/preview/${domain}/contato`;
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    footer_contact_title: [''],
    footer_contact_text: [''],
    contact_store_name: [''],
    contact_cnpj: [''],
    contact_phone: [''],
    contact_whatsapp: [''],
    contact_email: [''],
    contact_hours: [''],
    contact_address: [''],
    contact_map_embed_url: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.loadTenantDomain();
    await this.load();
  }

  protected formatContactPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.contact_phone.setValue(formatPhone(digitsOnly(input.value)), { emitEvent: false });
  }

  protected formatContactWhatsappInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.contact_whatsapp.setValue(formatPhone(digitsOnly(input.value)), { emitEvent: false });
  }

  protected formatContactCnpjInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.controls.contact_cnpj.setValue(formatCnpj(digitsOnly(input.value)), { emitEvent: false });
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const value = this.form.getRawValue();
      const payload: StoreContactSettingsPayload = {
        footer_contact_title: value.footer_contact_title.trim(),
        footer_contact_text: value.footer_contact_text.trim(),
        contact_store_name: value.contact_store_name.trim(),
        contact_cnpj: value.contact_cnpj.trim(),
        contact_phone: value.contact_phone.trim(),
        contact_whatsapp: value.contact_whatsapp.trim(),
        contact_email: value.contact_email.trim(),
        contact_hours: value.contact_hours.trim(),
        contact_address: value.contact_address.trim(),
        contact_map_embed_url: value.contact_map_embed_url.trim(),
      };

      await this.lojaService.updateContact(payload);
      this.successMessage.set('Contato salvo e publicado.');
      await this.load();
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async loadTenantDomain(): Promise<void> {
    try {
      const response = await this.tenantService.getDomain();
      const domain = (response?.dominio || '').trim();
      if (domain) {
        this.tenantDomain.set(domain);
      }
    } catch {
      return;
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const config = await this.lojaService.getConfig();
      this.currentConfig.set(config);
      this.form.patchValue(
        {
          footer_contact_title: config.footer_contact_title || '',
          footer_contact_text: config.footer_contact_text || '',
          contact_store_name: config.contact_store_name || '',
          contact_cnpj: config.contact_cnpj || '',
          contact_phone: config.contact_phone || '',
          contact_whatsapp: config.contact_whatsapp || '',
          contact_email: config.contact_email || '',
          contact_hours: config.contact_hours || '',
          contact_address: config.contact_address || '',
          contact_map_embed_url: config.contact_map_embed_url || '',
        },
        { emitEvent: false }
      );
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
