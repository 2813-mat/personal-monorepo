import { Component, input, computed } from '@angular/core';
import { NgClass } from '@angular/common';

type MoneySize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

@Component({
  selector: 'cf-money',
  standalone: true,
  imports: [NgClass],
  templateUrl: './money.component.html',
  styleUrl: './money.component.scss',
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
