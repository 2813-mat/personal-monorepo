import { Component, input, output } from '@angular/core';

@Component({
  selector: 'cf-confirm-modal',
  standalone: true,
  host: {
    '(document:keydown.escape)': 'cancelled.emit()',
  },
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss',
})
export class ConfirmModalComponent {
  title = input.required<string>();
  description = input('');
  confirmLabel = input('Confirmar');
  cancelLabel = input('Cancelar');
  danger = input(false);

  confirmed = output<void>();
  cancelled = output<void>();

  onBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.cancelled.emit();
    }
  }
}
