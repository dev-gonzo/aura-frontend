import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { EditaisService, EditalUploadResponse } from '../../services/editais.service';

@Component({
  selector: 'app-upload-edital-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, ButtonComponent],
  templateUrl: './upload-edital.page.html',
  styleUrl: './upload-edital.page.css'
})
export class UploadEditalPage {
  private readonly editaisService = inject(EditaisService);

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly sending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly uploadResult = signal<EditalUploadResponse | null>(null);

  protected openFileSelector(): void {
    this.fileInput?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const file = target.files?.item(0) ?? null;
    this.selectedFile.set(file);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.uploadResult.set(null);
  }

  protected clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.uploadResult.set(null);

    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  protected async sendFile(): Promise<void> {
    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('Selecione um arquivo para enviar.');
      return;
    }

    this.sending.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.uploadResult.set(null);

    try {
      const response = await this.editaisService.uploadArquivo(file);
      this.uploadResult.set(response);
      this.successMessage.set('Arquivo enviado com sucesso.');
    } catch (error) {
      this.errorMessage.set(processApiError(error));
    } finally {
      this.sending.set(false);
    }
  }

  protected formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
}
