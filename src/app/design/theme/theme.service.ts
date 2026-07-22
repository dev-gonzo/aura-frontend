import { Injectable, signal } from '@angular/core';

import { FontSize, ThemeMode } from './theme.types';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeKey = 'aura-theme';
  private readonly fontKey = 'aura-font-size';

  private readonly _theme = signal<ThemeMode>(this.loadTheme());
  private readonly _fontSize = signal<FontSize>(this.loadFontSize());

  readonly theme = this._theme.asReadonly();
  readonly fontSize = this._fontSize.asReadonly();

  constructor() {
    this.applyToDOM();
  }

  toggleTheme(): void {
    const next = this._theme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(value: ThemeMode): void {
    this._theme.set(value);
    localStorage.setItem(this.themeKey, value);
    this.applyToDOM();
  }

  adjustFontSize(direction: 'increase' | 'decrease'): void {
    const sizes: FontSize[] = ['sm', 'md', 'lg', 'xl'];
    const currentIndex = sizes.indexOf(this._fontSize());
    const nextIndex =
      direction === 'increase'
        ? Math.min(currentIndex + 1, sizes.length - 1)
        : Math.max(currentIndex - 1, 0);

    this.setFontSize(sizes[nextIndex]);
  }

  resetFontSize(): void {
    this.setFontSize('md');
  }

  private setFontSize(size: FontSize): void {
    this._fontSize.set(size);
    localStorage.setItem(this.fontKey, size);
    this.applyToDOM();
  }

  private loadTheme(): ThemeMode {
    const savedTheme = localStorage.getItem(this.themeKey);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    return 'dark';
  }

  private loadFontSize(): FontSize {
    const savedFontSize = localStorage.getItem(this.fontKey);

    if (savedFontSize === 'sm' || savedFontSize === 'lg' || savedFontSize === 'xl') {
      return savedFontSize;
    }

    return 'md';
  }

  private applyToDOM(): void {
    document.documentElement.setAttribute('data-theme', this._theme());
    document.documentElement.setAttribute('data-font', this._fontSize());
  }
}
