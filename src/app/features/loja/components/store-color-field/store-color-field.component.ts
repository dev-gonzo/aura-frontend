import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';

type StoreColorPreviewMode = 'surface' | 'text' | 'button' | 'badge';

@Component({
  selector: 'app-store-color-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormInputComponent],
  templateUrl: './store-color-field.component.html',
  styleUrl: './store-color-field.component.css',
})
export class StoreColorFieldComponent {
  @Input({ required: true }) control!: FormControl<string>;
  @Input({ required: true }) label!: string;
  @Input() description = '';
  @Input() usage = '';
  @Input() helperText = '';
  @Input() errorText = '';
  @Input() invalid = false;
  @Input() required = false;
  @Input() placeholder = '#000000';
  @Input() previewLabel = 'Amostra';
  @Input() previewMode: StoreColorPreviewMode = 'surface';
  @Input() previewBackground = '';
  @Input() previewTextColor = '#F8FAFC';
  @Input() previewOutline = '';
  @Input() showPreview = true;

  protected get currentColor(): string {
    return this.control?.value || '#000000';
  }

  protected get previewStyles(): Record<string, string> {
    const background =
      this.previewMode === 'text'
        ? this.previewBackground || 'rgba(15, 23, 42, 0.9)'
        : this.currentColor;

    const color = this.previewMode === 'text' ? this.currentColor : this.previewTextColor || '#F8FAFC';
    const borderColor = this.previewOutline || 'rgba(148, 163, 184, 0.18)';

    return {
      background,
      color,
      borderColor,
    };
  }
}
