import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface FormIconSelectOption {
  value: string;
  label: string;
  iconClass: string;
}

@Component({
  selector: 'app-form-icon-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-icon-select.component.html',
  styleUrl: './form-icon-select.component.css',
})
export class FormIconSelectComponent {
  private static nextId = 0;

  @Input({ required: true }) label!: string;
  @Input({ required: true }) options: FormIconSelectOption[] = [];
  @Input() value = '';
  @Input() placeholder = 'Selecione';
  @Input() helperText = '';
  @Input() errorText = '';
  @Input() required = false;
  @Input() invalid = false;
  @Output() valueChange = new EventEmitter<string>();

  protected readonly inputId = `form-icon-select-${FormIconSelectComponent.nextId++}`;
  protected open = false;

  protected get selectedOption(): FormIconSelectOption | null {
    return this.options.find((option) => option.value === this.value) ?? null;
  }

  protected toggleOpen(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.open = !this.open;
  }

  protected close(): void {
    this.open = false;
  }

  protected select(value: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.valueChange.emit(value);
    this.open = false;
  }
}
