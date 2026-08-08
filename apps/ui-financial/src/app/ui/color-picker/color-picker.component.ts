import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ColorOption {
  hex: string;
  nome: string;
}

/**
 * Paleta clicável com o seletor nativo atrás, como escape para uma cor fora
 * dela. Ninguém sabe hexadecimal de cabeça — o campo de texto livre saiu.
 *
 * É um ControlValueAccessor para entrar nos formulários com
 * `formControlName`, e assim escolher uma amostra já marca o controle como
 * dirty (os drawers dependem disso para habilitar o Salvar).
 */
@Component({
  selector: 'cf-color-picker',
  standalone: true,
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPickerComponent),
      multi: true,
    },
  ],
})
export class ColorPickerComponent implements ControlValueAccessor {
  readonly palette = input.required<readonly ColorOption[]>();
  /** Id do input nativo, para o `for` de um rótulo externo. */
  readonly inputId = input('color');

  protected readonly value = signal('');

  private onChange: (v: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(v: string | null): void {
    this.value.set(v ?? '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** O seletor nativo devolve minúsculo; o valor salvo pode estar maiúsculo. */
  protected isSelected(hex: string): boolean {
    return this.value().toUpperCase() === hex.toUpperCase();
  }

  protected pick(hex: string): void {
    this.value.set(hex);
    this.onChange(hex);
    this.onTouched();
  }

  protected pickNative(event: Event): void {
    this.pick((event.target as HTMLInputElement).value);
  }
}
