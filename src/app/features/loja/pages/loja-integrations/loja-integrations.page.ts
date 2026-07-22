import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { LojaService, StoreIntegrationsPayload, StoreSettingsResponse } from '../../services/loja.service';

type IntegrationField =
  | 'facebook_pixel_id'
  | 'google_ads_id'
  | 'google_ads_conversion_label'
  | 'google_analytics_id'
  | 'google_tag_manager_id'
  | 'microsoft_clarity_id'
  | 'tiktok_pixel_id';

@Component({
  selector: 'app-loja-integrations-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, FormInputComponent, ButtonComponent],
  templateUrl: './loja-integrations.page.html',
  styleUrl: './loja-integrations.page.css',
})
export class LojaIntegrationsPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly lojaService = inject(LojaService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly hasInstalledIntegrations = computed(() => {
    const value = this.form.getRawValue();
    return Object.values(value).some((item) => item.trim().length > 0);
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    facebook_pixel_id: [''],
    google_ads_id: [''],
    google_ads_conversion_label: [''],
    google_analytics_id: [''],
    google_tag_manager_id: [''],
    microsoft_clarity_id: [''],
    tiktok_pixel_id: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected hasFieldError(_field: IntegrationField): boolean {
    return false;
  }

  protected getFieldError(_field: IntegrationField): string {
    return '';
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.lojaService.updateIntegrations(this.normalizeIntegrations(this.form.getRawValue()));
      this.successMessage.set('Integrações salvas e aplicadas na loja.');
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

    try {
      const config: StoreSettingsResponse = await this.lojaService.getConfig();
      this.form.patchValue(
        {
          facebook_pixel_id: config.integrations?.facebook_pixel_id || '',
          google_ads_id: config.integrations?.google_ads_id || '',
          google_ads_conversion_label: config.integrations?.google_ads_conversion_label || '',
          google_analytics_id: config.integrations?.google_analytics_id || '',
          google_tag_manager_id: config.integrations?.google_tag_manager_id || '',
          microsoft_clarity_id: config.integrations?.microsoft_clarity_id || '',
          tiktok_pixel_id: config.integrations?.tiktok_pixel_id || '',
        },
        { emitEvent: false }
      );
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private normalizeIntegrations(value: StoreIntegrationsPayload): StoreIntegrationsPayload {
    return {
      facebook_pixel_id: value.facebook_pixel_id?.trim() || '',
      google_ads_id: value.google_ads_id?.trim() || '',
      google_ads_conversion_label: value.google_ads_conversion_label?.trim() || '',
      google_analytics_id: value.google_analytics_id?.trim() || '',
      google_tag_manager_id: value.google_tag_manager_id?.trim() || '',
      microsoft_clarity_id: value.microsoft_clarity_id?.trim() || '',
      tiktok_pixel_id: value.tiktok_pixel_id?.trim() || '',
    };
  }
}
