import { Component, input, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';

@Component({
  selector: 'cf-card-chip',
  standalone: true,
  templateUrl: './card-chip.component.html',
  styleUrl: './card-chip.component.scss',
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
