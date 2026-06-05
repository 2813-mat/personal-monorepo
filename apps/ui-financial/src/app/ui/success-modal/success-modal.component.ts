import { Component, input, output, computed } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'cf-success-modal',
  standalone: true,
  imports: [IconComponent],
  host: {
    '(document:keydown.escape)': 'dismissed.emit()',
  },
  templateUrl: './success-modal.component.html',
  styleUrl: './success-modal.component.scss',
})
export class SuccessModalComponent {
  title = input('Tudo certo!');
  amount = input<number | null>(null);
  transactionId = input<string | null>(null);

  dismissed = output<void>();
  receipt = output<void>();

  onBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.dismissed.emit();
    }
  }

  formattedAmount = computed(() => {
    const value = this.amount();
    if (value === null) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  });
}
