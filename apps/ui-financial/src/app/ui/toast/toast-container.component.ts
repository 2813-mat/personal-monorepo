import { Component, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'cf-toast-container',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="toast-stack">
      @for (t of toasts(); track t.id) {
        <div class="toast" [class]="'toast--' + t.type">
          <div class="toast__accent"></div>
          <span class="toast__message">{{ t.message }}</span>
          @if (t.action) {
            <button
              type="button"
              class="toast__action"
              (click)="onAction(t)"
            >{{ t.action.label }}</button>
          }
          <button
            type="button"
            class="toast__close"
            aria-label="Fechar"
            (click)="toastSvc.dismiss(t.id)"
          >
            <cf-icon name="x" [size]="11" color="currentColor" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .toast-stack {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 95;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .toast {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 240px;
      max-width: 360px;
      padding: 10px 12px 10px 16px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      animation: cf-toast-in 220ms cubic-bezier(.2, .7, .3, 1) both;
    }
    @keyframes cf-toast-in {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .toast__accent {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: 4px;
    }
    .toast--pos { background: var(--pos-soft); }
    .toast--pos .toast__accent { background: var(--pos); }
    .toast--neg { background: var(--neg-soft); }
    .toast--neg .toast__accent { background: var(--neg); }
    .toast--warn { background: var(--warn-soft); }
    .toast--warn .toast__accent { background: var(--warn); }
    .toast__message {
      flex: 1;
      font-size: 13px;
      color: var(--ink-1);
      line-height: 1.4;
    }
    .toast__action {
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      color: var(--ink-1);
      background: transparent;
      border: 0;
      cursor: pointer;
      flex-shrink: 0;
    }
    .toast__action:hover { text-decoration: underline; }
    .toast__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      color: var(--ink-3);
      background: transparent;
      border: 0;
      cursor: pointer;
      flex-shrink: 0;
    }
    .toast__close:hover { color: var(--ink-1); }
  `],
})
export class ToastContainerComponent {
  protected toastSvc = inject(ToastService);
  toasts = this.toastSvc.toasts;

  onAction(t: Toast): void {
    t.action?.callback();
    this.toastSvc.dismiss(t.id);
  }
}
