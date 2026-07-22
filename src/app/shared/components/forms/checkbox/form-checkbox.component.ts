import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-checkbox',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-checkbox.component.html',
  styleUrl: './form-checkbox.component.css'
})
export class FormCheckboxComponent {
  @Input() control?: FormControl;
  @Input({ required: true }) label!: string;
  @Input() checked = false;
  @Input() disabled = false;
}
