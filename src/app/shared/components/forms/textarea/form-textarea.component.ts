import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-textarea',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-textarea.component.html',
  styleUrl: './form-textarea.component.css'
})
export class FormTextareaComponent {
  private static nextId = 0;
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('textareaElement') private readonly textareaElement?: ElementRef<HTMLTextAreaElement>;

  @Input({ required: true }) control!: FormControl;
  @Input({ required: true }) label!: string;
  @Input() rows = 4;
  @Input() autoGrow = false;
  @Input() autoGrowStep = 3;
  @Input() placeholder = '';
  @Input() helperText = '';
  @Input() errorText = '';
  @Input() required = false;
  @Input() invalid = false;

  protected readonly inputId = `form-textarea-${FormTextareaComponent.nextId++}`;
  protected displayedRows = this.rows;

  ngAfterViewInit(): void {
    this.displayedRows = this.rows;
    if (!this.autoGrow) {
      return;
    }

    this.control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.adjustTextareaRows();
    });

    queueMicrotask(() => this.adjustTextareaRows());
  }

  protected handleInput(): void {
    if (!this.autoGrow) {
      return;
    }
    this.adjustTextareaRows();
  }

  private adjustTextareaRows(): void {
    const textarea = this.textareaElement?.nativeElement;
    if (!textarea) {
      return;
    }

    const minimumRows = Math.max(1, this.rows);
    const growStep = Math.max(1, this.autoGrowStep);
    const computedStyle = globalThis.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight || '0') || 24;
    const verticalExtras =
      Number.parseFloat(computedStyle.paddingTop || '0') +
      Number.parseFloat(computedStyle.paddingBottom || '0') +
      Number.parseFloat(computedStyle.borderTopWidth || '0') +
      Number.parseFloat(computedStyle.borderBottomWidth || '0');

    textarea.rows = minimumRows;
    const contentRows = Math.max(minimumRows, Math.ceil((textarea.scrollHeight - verticalExtras) / lineHeight));
    const nextRows = Math.max(minimumRows, Math.ceil(contentRows / growStep) * growStep);

    this.displayedRows = nextRows;
    textarea.rows = nextRows;
  }
}
