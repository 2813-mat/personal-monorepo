import { Component, input, output, computed } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

interface EmptyAction {
  label: string;
  icon?: string;
}

@Component({
  selector: 'cf-empty-state',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="empty">
      <div class="empty__icon">
        <cf-icon [name]="icon()" [size]="32" color="var(--ink-4)" />
      </div>
      <div class="empty__title">{{ title() }}</div>
      @if (description()) {
        <div class="empty__desc">{{ description() }}</div>
      }
      @if (visibleActions().length) {
        <div class="empty__actions">
          @for (action of visibleActions(); track $index) {
            <button
              type="button"
              class="empty__btn"
              [class.empty__btn--primary]="$index === 0"
              [class.empty__btn--ghost]="$index !== 0"
              (click)="actionClick.emit($index)"
            >
              @if (action.icon) {
                <cf-icon [name]="action.icon" [size]="13" color="currentColor" />
              }
              {{ action.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 6px;
      padding: 40px 24px;
    }
    .empty__icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-alt);
      margin-bottom: 6px;
    }
    .empty__title {
      font-size: 15px;
      font-weight: 600;
      color: var(--ink-1);
    }
    .empty__desc {
      font-size: 13px;
      color: var(--ink-3);
      max-width: 320px;
      line-height: 1.5;
    }
    .empty__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 10px;
    }
    .empty__btn {
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
    .empty__btn--primary {
      background: var(--brand);
      color: #fff;
      border: 1px solid var(--brand);
    }
    .empty__btn--primary:hover { opacity: 0.9; }
    .empty__btn--ghost {
      background: transparent;
      color: var(--ink-2);
      border: 1px solid var(--line);
    }
    .empty__btn--ghost:hover { background: var(--surface-alt); }
  `],
})
export class EmptyStateComponent {
  icon = input('list');
  title = input.required<string>();
  description = input('');
  actions = input<EmptyAction[]>([]);

  actionClick = output<number>();

  visibleActions = computed(() => this.actions().slice(0, 3));
}
