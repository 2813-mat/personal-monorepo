import { Component, signal, effect } from '@angular/core';
import { DashboardAComponent } from './dashboard-a.component';
import { DashboardBComponent } from './dashboard-b.component';
import { DashboardCComponent } from './dashboard-c.component';

type DashTab = 'a' | 'b' | 'c';

const LS_KEY = 'cf-dash-tab';

const TABS: { id: DashTab; label: string; desc: string }[] = [
  { id: 'a', label: 'Planilha',  desc: 'Tabela detalhada com todas as transações' },
  { id: 'b', label: 'KPI Grid',  desc: 'Visão executiva com 4 métricas e gráfico de categorias' },
  { id: 'c', label: 'Faturas',   desc: 'Grade de cartões ordenada por fechamento' },
];

@Component({
  selector: 'cf-dashboard',
  standalone: true,
  imports: [DashboardAComponent, DashboardBComponent, DashboardCComponent],
  template: `
    <div class="tab-bar">
      @for (tab of tabs; track tab.id) {
        <button
          class="tab-btn"
          [class.active]="activeTab() === tab.id"
          (click)="setTab(tab.id)"
          [title]="tab.desc"
        >
          {{ tab.label }}
        </button>
      }
    </div>

    @switch (activeTab()) {
      @case ('a') { <cf-dashboard-a /> }
      @case ('b') { <cf-dashboard-b /> }
      @default    { <cf-dashboard-c /> }
    }
  `,
  styles: [`
    :host { display:block; }

    .tab-bar {
      display: flex;
      gap: 0;
      margin-bottom: 12px;
      border: 1px solid var(--line);
      background: var(--surface);
      box-shadow: var(--shadow-sm);
      align-self: flex-start;
      width: fit-content;
    }

    .tab-btn {
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 500;
      color: var(--ink-3);
      background: none;
      border: none;
      border-right: 1px solid var(--line);
      cursor: pointer;
      font-family: inherit;
      letter-spacing: 0.1px;
      transition: background 0.1s, color 0.1s;
    }
    .tab-btn:last-child { border-right: none; }
    .tab-btn:hover { background: var(--surface-alt); color: var(--ink-1); }
    .tab-btn.active {
      background: var(--ink-1);
      color: #fff;
    }
  `],
})
export class DashboardComponent {
  tabs = TABS;

  activeTab = signal<DashTab>(
    (localStorage.getItem(LS_KEY) as DashTab | null) ?? 'c'
  );

  constructor() {
    effect(() => {
      localStorage.setItem(LS_KEY, this.activeTab());
    });
  }

  setTab(tab: DashTab) {
    this.activeTab.set(tab);
  }
}
