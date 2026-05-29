import { Component, inject, signal } from '@angular/core';
import type { HolderFilter } from '@caixa-familia/shared-types';
import { AppDataService } from './app-data.service';
import { IconComponent } from '../ui/icon/icon.component';
import { AvatarComponent } from '../ui/avatar/avatar.component';
import { ExpenseDrawerComponent } from '../features/expense-drawer/expense-drawer.component';

@Component({
  selector: 'cf-topbar',
  standalone: true,
  imports: [IconComponent, AvatarComponent, ExpenseDrawerComponent],
  template: `
    <header class="topbar">
      <div class="month-nav">
        <button class="month-nav-btn" (click)="prevMonth()" aria-label="Mês anterior">
          <cf-icon name="arrowLeft" [size]="11" />
        </button>
        <div class="month-label">{{ data.monthLabel() }}</div>
        <button class="month-nav-btn" (click)="nextMonth()" aria-label="Próximo mês">
          <cf-icon name="arrowRight" [size]="11" />
        </button>
      </div>

      <div class="seg" role="group" aria-label="Filtrar por pessoa">
        <button class="seg-btn" [class.active]="filter() === 'todos'" (click)="setFilter('todos')">
          Todos
        </button>
        <button class="seg-btn" [class.active]="filter() === 'Mateus'" (click)="setFilter('Mateus')">
          <cf-avatar holder="Mateus" [size]="12" /> Mateus
        </button>
        <button class="seg-btn" [class.active]="filter() === 'Thais'" (click)="setFilter('Thais')">
          <cf-avatar holder="Thais" [size]="12" /> Thais
        </button>
      </div>

      <div class="topbar-spacer"></div>

      <button class="topbar-btn ghost">
        <cf-icon name="upload" [size]="11" /> Importar
      </button>
      <button class="topbar-btn" (click)="drawerOpen.set(true)">
        <cf-icon name="plus" [size]="11" /> Lançar gasto
      </button>
    </header>

    @if (drawerOpen()) {
      <cf-expense-drawer (closed)="drawerOpen.set(false)" />
    }
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; gap: 16px;
      height: 48px;
      background: var(--surface);
      border-bottom: 1px solid var(--line);
      padding: 0 20px;
      flex-shrink: 0;
    }

    .month-nav { display: flex; align-items: center; gap: 8px; }
    .month-nav-btn {
      width: 24px; height: 24px;
      border: 1px solid var(--line);
      background: var(--surface);
      display: flex; align-items: center; justify-content: center;
      color: var(--ink-2); cursor: pointer;
    }
    .month-nav-btn:hover { background: var(--surface-alt); }
    .month-label {
      font-size: 13px; font-weight: 600; color: var(--ink-1);
      min-width: 110px; text-align: center;
    }

    .seg {
      display: inline-flex;
      border: 1px solid var(--line);
      background: var(--surface);
      height: 26px;
    }
    .seg-btn {
      padding: 0 10px;
      font-size: 11.5px; color: var(--ink-2);
      display: flex; align-items: center; gap: 6px;
      cursor: pointer;
      border-right: 1px solid var(--line);
      background: none; border-top: 0; border-bottom: 0; border-left: 0;
    }
    .seg-btn:last-child { border-right: 0; }
    .seg-btn.active { background: var(--ink-1); color: #fff; }

    .topbar-spacer { flex: 1; }

    .topbar-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 0 12px; height: 28px;
      font-size: 12px; font-weight: 500;
      background: var(--ink-1); color: #fff;
      cursor: pointer;
    }
    .topbar-btn:disabled { opacity: 0.5; cursor: default; }
    .topbar-btn.ghost { background: var(--surface); color: var(--ink-1); border: 1px solid var(--line); }
    .topbar-btn:not(:disabled):hover { opacity: 0.9; }
  `],
})
export class TopBarComponent {
  protected data = inject(AppDataService);

  protected drawerOpen = signal(false);

  filter() {
    return this.data.holderFilter();
  }

  setFilter(f: HolderFilter) {
    this.data.holderFilter.set(f);
  }

  prevMonth() {
    const m = this.data.currentMonth();
    const date = new Date(m.year, m.month - 2);
    this.data.currentMonth.set({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        .replace(/^./, s => s.toUpperCase()),
      short: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    });
  }

  nextMonth() {
    const m = this.data.currentMonth();
    const date = new Date(m.year, m.month);
    this.data.currentMonth.set({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        .replace(/^./, s => s.toUpperCase()),
      short: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    });
  }
}
