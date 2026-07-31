import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, Input, OnDestroy, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { exec, init } from 'pell';

interface PellEditorInstance {
  content: HTMLDivElement;
}

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './markdown-editor.component.html',
  styleUrl: './markdown-editor.component.css',
})
export class MarkdownEditorComponent implements AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private editor?: PellEditorInstance;
  private syncingFromEditor = false;
  private syncingFromControl = false;
  private removeBlurListener?: () => void;

  @ViewChild('editorHost') private readonly editorHost?: ElementRef<HTMLDivElement>;

  @Input({ required: true }) control!: FormControl;
  @Input({ required: true }) label!: string;
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() errorText = '';
  @Input() required = false;
  @Input() invalid = false;
  @Input() minHeight = '11rem';
  @Input() onInsertImage?: () => void;

  private static nextId = 0;
  protected readonly inputId = `markdown-editor-${MarkdownEditorComponent.nextId++}`;

  ngAfterViewInit(): void {
    const host = this.editorHost?.nativeElement;
    if (!host) {
      return;
    }

    const actions = ['bold', 'italic', 'underline', 'ulist', 'olist'] as any[];
    if (this.onInsertImage) {
      actions.push({
        name: 'image',
        icon: '<i class="fa-regular fa-image"></i>',
        title: 'Inserir imagem',
        result: () => {
          this.onInsertImage?.();
          return true;
        },
      });
    }

    host.innerHTML = '';
    this.editor = init({
      element: host,
      defaultParagraphSeparator: 'div',
      actions,
      onChange: (value) => {
        if (this.syncingFromControl) {
          return;
        }

        this.syncingFromEditor = true;
        this.control.setValue(normalizeEditorHtml(value));
        this.control.markAsDirty();
        this.syncingFromEditor = false;
      },
    }) as PellEditorInstance;

    const content = this.editor.content;
    content.id = this.inputId;
    content.dataset['placeholder'] = this.placeholder;
    content.style.minHeight = this.minHeight;
    content.innerHTML = normalizeEditorHtml(this.control.value ?? '');
    content.setAttribute('aria-label', this.label);
    content.setAttribute('aria-multiline', 'true');
    content.setAttribute('aria-invalid', String(this.invalid));
    content.contentEditable = String(!this.control.disabled);

    const handleBlur = () => this.control.markAsTouched();
    content.addEventListener('blur', handleBlur);
    this.removeBlurListener = () => content.removeEventListener('blur', handleBlur);

    this.control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (!this.editor || this.syncingFromEditor) {
        return;
      }

      const nextValue = normalizeEditorHtml(value ?? '');
      if (normalizeEditorHtml(this.editor.content.innerHTML) === nextValue) {
        return;
      }

      this.syncingFromControl = true;
      this.editor.content.innerHTML = nextValue;
      this.syncingFromControl = false;
    });
  }

  ngOnDestroy(): void {
    this.removeBlurListener?.();
    const host = this.editorHost?.nativeElement;
    if (host) {
      host.innerHTML = '';
    }
  }

  insertHtml(html: string): void {
    if (!this.editor) {
      return;
    }
    exec('insertHTML', html);
  }

  getEditableElement(): HTMLDivElement | null {
    return this.editor?.content ?? null;
  }
}

function normalizeEditorHtml(value: string | null | undefined): string {
  const html = (value ?? '').trim();
  if (!html) {
    return '';
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  const text = container.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
  return text ? html : '';
}
