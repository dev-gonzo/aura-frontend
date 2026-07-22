import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-input.component.html',
  styleUrl: './form-input.component.css'
})
export class FormInputComponent {
  private static nextId = 0;

  @Input({ required: true }) control!: FormControl;
  @Input({ required: true }) label!: string;
  @Input() id = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() errorText = '';
  @Input() inputmode = '';
  @Input() autocomplete = 'off';
  @Input() maxlength?: number;
  @Input() min?: number | string;
  @Input() max?: number | string;
  @Input() step?: number | string;
  @Input() readonly = false;
  @Input() disabled = false;
  @Input() required = false;
  @Input() invalid = false;
  @Output() readonly inputEvent = new EventEmitter<Event>();

  protected readonly fallbackInputId = `form-input-${FormInputComponent.nextId++}`;

  protected get inputId(): string {
    return this.id || this.fallbackInputId;
  }
}
