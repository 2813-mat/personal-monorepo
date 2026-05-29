import { Component, input, output } from '@angular/core';

@Component({
  selector: 'cf-confirm-modal',
  standalone: true,
  host: {
    '(document:keydown.escape)': 'cancelled.emit()',
  },
  template: `
    <div class="backdrop" (click)="cancelled.emit()">
      <div class="card" (click)="$event.stopPropagation()">
        <div class="card__title">{{ title() }}</div>
        @if (description()) {
          <div class="card__desc">{{ description() }}</div>
        }
        <div class="card__actions">
          <button type="button" class="btn btn--ghost" (click)="cancelled.emit()">
            {{ cancelLabel() }}
          </button>
          <button
            type="button"
            class="btn"
            [class.btn--brand]="!danger()"
            [class.btn--danger]="danger()"
            (click)="confirmed.emit()"
          >
            {{ confirmLabel() }}
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
      padding: 20px;
    }
    .card__title {
      font-size: 15px;
      font-weight: 600;
      color: var(--ink-1);
    }
    .card__desc {
      font-size: 13px;
      color: var(--ink-3);
      line-height: 1.5;
      margin-top: 6px;
    }
    .card__actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
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
    .btn--danger {
      background: var(--neg);
      color: #fff;
      border: 1px solid var(--neg);
    }
    .btn--danger:hover { opacity: 0.9; }
  `],
})
export class ConfirmModalComponent {
  title = input.required<string>();
  description = input('');
  confirmLabel = input('Confirmar');
  cancelLabel = input('Cancelar');
  danger = input(false);

  confirmed = output<void>();
  cancelled = output<void>();
}
