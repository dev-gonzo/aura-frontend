import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';

@Component({
  selector: 'app-change-password-fields',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormInputComponent],
  templateUrl: './change-password-fields.component.html',
  styleUrl: './change-password-fields.component.css'
})
export class ChangePasswordFieldsComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) hasFieldError!: (
    field: 'senha_atual' | 'nova_senha' | 'confirmacao_senha'
  ) => boolean;
  @Input({ required: true }) getFieldError!: (
    field: 'senha_atual' | 'nova_senha' | 'confirmacao_senha'
  ) => string;

  protected get senhaAtualControl(): FormControl {
    return this.form.get('senha_atual') as FormControl;
  }

  protected get novaSenhaControl(): FormControl {
    return this.form.get('nova_senha') as FormControl;
  }

  protected get confirmacaoSenhaControl(): FormControl {
    return this.form.get('confirmacao_senha') as FormControl;
  }
}
