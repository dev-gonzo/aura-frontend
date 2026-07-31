import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.css'
})
export class ImageUploadComponent {
  private static nextId = 0;

  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  @Input({ required: true }) label!: string;
  @Input() required = false;
  @Input() invalid = false;
  @Input() errorText = '';
  @Input() previewUrl: string | null = null;
  @Input() placeholderTitle = 'Imagem não enviada';
  @Input() placeholderSubtitle = 'Clique para enviar';
  @Input() accept = 'image/*';
  @Input() ariaLabel = 'Selecionar imagem';
  @Input() shape: 'square' | 'circle' = 'square';
  @Input() layout: 'square' | 'free' = 'square';
  @Input() previewFit: 'cover' | 'contain' = 'cover';
  @Input() previewMode: 'default' | 'thumbnail' = 'default';
  @Input() fullWidth = false;
  @Input() disabled = false;

  @Output() readonly fileSelected = new EventEmitter<Event>();
  @Output() readonly previewLoad = new EventEmitter<void>();
  @Output() readonly previewError = new EventEmitter<Event>();

  protected readonly inputId = `image-upload-${ImageUploadComponent.nextId++}`;

  protected openPicker(): void {
    if (this.disabled) {
      return;
    }
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
      this.fileInput.nativeElement.click();
    }
  }

  protected handleFileSelected(event: Event): void {
    this.fileSelected.emit(event);
  }

  protected handlePreviewLoad(): void {
    this.previewLoad.emit();
  }

  protected handlePreviewError(event: Event): void {
    this.previewError.emit(event);
  }
}
