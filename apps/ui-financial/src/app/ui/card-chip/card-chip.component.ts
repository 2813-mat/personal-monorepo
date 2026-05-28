import { Component, input, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';

@Component({
  selector: 'cf-card-chip',
  standalone: true,
  template: `
    @if (card()) {
      <span
        class="card-chip"
        [class.card-chip--md]="size() === 'md'"
        [style.background]="card()!.color"
      >{{ label() }}</span>
    }
  `,
  styles: [`
    .card-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 16px;
      font-size: 8px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }
    .card-chip--md {
      width: 36px;
      height: 22px;
      font-size: 9px;
    }
  `],
})
export class CardChipComponent {
  private data = inject(AppDataService);

  cardId = input.required<string>();
  size = input<'sm' | 'md'>('sm');

  card = computed(() => this.data.cardBy()[this.cardId()]);

  label = computed(() => {
    const c = this.card();
    if (!c) return '';
    return c.bank.length <= 4 ? c.bank : c.bank.slice(0, 3) + '.';
  });
}
