import { Component, input, output, computed } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'cf-success-modal',
  standalone: true,
  imports: [IconComponent],
  host: {
    '(document:keydown.escape)': 'dismissed.emit()',
  },
  template: `
    <div
      class="backdrop"
      role="button"
      tabindex="0"
      aria-label="Fechar"
      (click)="onBackdrop($event)"
      (keydown.enter)="dismissed.emit()"
      (keydown.space)="dismissed.emit()"
    >
      <div class="card" role="dialog" aria-modal="true">
        <div class="card__check">
          <cf-icon name="check" [size]="28" color="var(--pos)" />
        </div>
        <div class="card__title">{{ title() }}</div>
        @if (formattedAmount()) {
          <div class="card__amount num">{{ formattedAmount() }}</div>
        }
        @if (transactionId()) {
          <div class="card__id mono">#{{ transactionId() }}</div>
        }
        <div class="card__actions">
          <button type="button" class="btn btn--ghost" (click)="receipt.emit()">
            Recibo
          </button>
          <button type="button" class="btn btn--brand" (click)="dismissed.emit()">
            Voltar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 20, 30, 0.32);
      z-index: 90;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: cf-fade 150ms ease both;
    }
    @keyframes cf-fade { from { opacity: 0; } to { opacity: 1; } }
    .card {
      width: 100%;
      max-width: 360px;
      margin: 16px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 10px;
      box-shadow: var(--shadow-sm);
      padding: 28px 20px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .card__check {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--pos-soft);
      margin-bottom: 14px;
      animation: cf-pop 260ms cubic-bezier(.2, .8, .3, 1.2) both;
    }
    @keyframes cf-pop {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .card__title {
      font-size: 16px;
      font-weight: 600;
      color: var(--ink-1);
    }
    .card__amount {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.4px;
      color: var(--ink-1);
      margin-top: 8px;
    }
    .card__id {
      font-size: 12px;
      color: var(--ink-3);
      margin-top: 4px;
    }
    .card__actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 22px;
      width: 100%;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex: 1;
      height: 32px;
      padding: 0 16px;
      font-size: 12px;
      font-weight: 500;
      font-family: inherit;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn--ghost {
      background: transparent;
      color: var(--ink-2);
      border: 1px solid var(--line);
    }
    .btn--ghost:hover { background: var(--surface-alt); }
    .btn--brand {
      background: var(--brand);
      color: #fff;
      border: 1px solid var(--brand);
    }
    .btn--brand:hover { opacity: 0.9; }
  `],
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
