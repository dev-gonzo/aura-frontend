import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, Input, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { processApiError } from '../../../../core/utils/process-api-error';
import { ButtonComponent } from '../../../../shared/components/actions/button/button.component';
import { ModalComponent } from '../../../../shared/components/feedback/modal/modal.component';
import { FormInputComponent } from '../../../../shared/components/forms/input/form-input.component';
import { ImageUploadComponent } from '../../../../shared/components/forms/image-upload/image-upload.component';
import { MarkdownEditorComponent } from '../../../../shared/components/forms/markdown-editor/markdown-editor.component';
import { CmsImagesService } from '../../services/cms-images.service';
import { ProcessedCmsImage, processCmsImage } from '../../utils/process-cms-image';

@Component({
  selector: 'app-cms-content-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    FormInputComponent,
    ImageUploadComponent,
    MarkdownEditorComponent,
    ModalComponent,
  ],
  templateUrl: './cms-content-editor.component.html',
  styleUrl: './cms-content-editor.component.css',
})
export class CmsContentEditorComponent implements AfterViewInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly cmsImagesService = inject(CmsImagesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly createdObjectUrls = new Set<string>();

  @ViewChild('contentEditor') private readonly contentEditor?: MarkdownEditorComponent;

  protected readonly imageModalOpen = signal(false);
  protected readonly imageProcessing = signal(false);
  protected readonly imageErrorMessage = signal('');
  protected readonly imagePreviewUrl = signal<string | null>(null);
  protected readonly selectedImage = signal<ProcessedCmsImage | null>(null);

  protected readonly imageForm = this.formBuilder.nonNullable.group({
    alt: [''],
  });

  @Input({ required: true }) control!: FormControl<string>;
  @Input() placeholder = 'Escreva o conteúdo aqui.';
  @Input() minHeight = '16rem';
  @Input() disabled = false;

  ngAfterViewInit(): void {
    this.control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      queueMicrotask(() => void this.ensurePreviewImages());
    });
    queueMicrotask(() => void this.ensurePreviewImages());
    this.destroyRef.onDestroy(() => {
      for (const url of this.createdObjectUrls) {
        URL.revokeObjectURL(url);
      }
      this.createdObjectUrls.clear();
    });
  }

  openImageModal(): void {
    if (this.disabled) {
      return;
    }
    this.resetImageModal();
    this.imageModalOpen.set(true);
  }

  closeImageModal(): void {
    this.imageModalOpen.set(false);
    this.resetImageModal();
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.imageProcessing.set(true);
    this.imageErrorMessage.set('');
    this.imagePreviewUrl.set(null);
    this.selectedImage.set(null);

    try {
      const processed = await processCmsImage(file);
      this.selectedImage.set(processed);
      this.imagePreviewUrl.set(processed.previewUrl);
    } catch (error) {
      this.imageErrorMessage.set(processApiError(error));
    } finally {
      this.imageProcessing.set(false);
    }
  }

  async insertImageIntoContent(): Promise<void> {
    const selected = this.selectedImage();
    if (!selected) {
      this.imageErrorMessage.set('Selecione uma imagem para inserir.');
      return;
    }

    this.imageProcessing.set(true);
    this.imageErrorMessage.set('');

    try {
      const response = await this.cmsImagesService.create(selected.payload);
      const url = this.cmsImagesService.rawUrl(response.id);
      const blob = await this.cmsImagesService.getRawBlob(response.id);
      const objectUrl = URL.createObjectURL(blob);
      this.createdObjectUrls.add(objectUrl);

      const alt = this.escapeHtmlAttr(this.imageForm.controls.alt.value ?? '');
      const html = alt
        ? `<div><img src="${objectUrl}" alt="${alt}" data-cms-image-id="${response.id}" data-cms-image-src="${url}" /></div>`
        : `<div><img src="${objectUrl}" data-cms-image-id="${response.id}" data-cms-image-src="${url}" /></div>`;
      this.contentEditor?.insertHtml(html);
      this.closeImageModal();
    } catch (error) {
      this.imageErrorMessage.set(processApiError(error));
    } finally {
      this.imageProcessing.set(false);
    }
  }

  normalizeForSave(): void {
    const html = String(this.control.value ?? '');
    if (!html.trim()) {
      return;
    }

    const container = document.createElement('div');
    container.innerHTML = html;
    const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    for (const img of images) {
      const src = img.getAttribute('data-cms-image-src');
      if (!src) {
        continue;
      }
      img.setAttribute('src', src);
      img.removeAttribute('data-cms-image-src');
      img.removeAttribute('data-cms-image-id');
    }
    this.control.setValue(container.innerHTML);
  }

  private async ensurePreviewImages(): Promise<void> {
    const editorElement = this.contentEditor?.getEditableElement();
    if (!editorElement) {
      return;
    }

    const images = Array.from(editorElement.querySelectorAll('img')) as HTMLImageElement[];
    for (const img of images) {
      const existingId = img.getAttribute('data-cms-image-id');
      if (existingId) {
        continue;
      }

      const src = img.getAttribute('src') ?? '';
      const match = src.match(/\/cms\/images\/([0-9a-fA-F-]{36})\/raw$/);
      if (!match) {
        continue;
      }

      const id = match[1];
      try {
        const blob = await this.cmsImagesService.getRawBlob(id);
        const objectUrl = URL.createObjectURL(blob);
        this.createdObjectUrls.add(objectUrl);
        img.setAttribute('data-cms-image-id', id);
        img.setAttribute('data-cms-image-src', src);
        img.src = objectUrl;
      } catch {
        img.setAttribute('data-cms-image-id', id);
        img.setAttribute('data-cms-image-src', src);
      }
    }
  }

  private resetImageModal(): void {
    this.imageProcessing.set(false);
    this.imageErrorMessage.set('');
    this.imagePreviewUrl.set(null);
    this.selectedImage.set(null);
    this.imageForm.reset({ alt: '' });
  }

  private escapeHtmlAttr(value: string): string {
    return String(value ?? '')
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
