import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
  @Input() maxWidth = '32rem';
  @Output() readonly close = new EventEmitter<void>();
}
