import { Component, input, computed } from '@angular/core';
import { NgClass } from '@angular/common';

type MoneySize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

@Component({
  selector: 'cf-money',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="money num" [ngClass]="sizeClass()" [style.color]="textColor()">
      <span class="money__currency">R$</span>
      <span class="money__integer">{{ intPart() }}</span>
      @if (cents()) {
        <span class="money__cents">,{{ centPart() }}</span>
      }
    </span>
  `,
  styles: [`
    .money { display: inline-flex; align-items: baseline; gap: 2px; }
    .money__currency { opacity: 0.6; font-weight: 400; margin-right: 2px; }
    .money__cents { opacity: 0.55; margin-left: 1px; }

    .money--sm { font-size: 12px; }
    .money--md { font-size: 13px; }
    .money--lg { font-size: 18px; font-weight: 600; letter-spacing: -0.2px; }
    .money--xl { font-size: 22px; font-weight: 600; letter-spacing: -0.4px; }
    .money--xxl { font-size: 28px; font-weight: 600; letter-spacing: -0.6px; }
  `],
})
export class MoneyComponent {
  value = input.required<number>();
  size = input<MoneySize>('md');
  cents = input(true);
  negColor = input(true);
  color = input<string | undefined>(undefined);

  sizeClass = computed(() => `money--${this.size()}`);

  textColor = computed(() => {
    if (this.color()) return this.color();
    if (!this.negColor()) return undefined;
    return this.value() < 0 ? 'var(--neg)' : undefined;
  });

  intPart = computed(() => {
    const abs = Math.abs(this.value());
    return Math.floor(abs).toLocaleString('pt-BR');
  });

  centPart = computed(() => {
    const abs = Math.abs(this.value());
    return (Math.round(abs * 100) % 100).toString().padStart(2, '0');
  });
}
