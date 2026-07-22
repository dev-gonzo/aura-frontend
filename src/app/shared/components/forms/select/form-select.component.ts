import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

export interface FormSelectOption {
  value: string;
  label: string;
  imported?: boolean;
}

@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-select.component.html',
  styleUrl: './form-select.component.css'
})
export class FormSelectComponent {
  private static nextId = 0;

  @Input({ required: true }) control!: FormControl;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) options: FormSelectOption[] = [];
  @Input() placeholder = 'Selecione';
  @Input() showPlaceholderOption = true;
  @Input() helperText = '';
  @Input() errorText = '';
  @Input() required = false;
  @Input() invalid = false;

  protected readonly inputId = `form-select-${FormSelectComponent.nextId++}`;
}
