import { Component, signal, effect, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
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
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private data = inject(AppDataService);

  tabs = TABS;

  /** Qualquer recurso do mês ainda em voo. */
  loading = computed(
    () =>
      this.data.transactionsLoading() ||
      this.data.incomesLoading() ||
      this.data.fixedLoading() ||
      this.data.goalsLoading(),
  );

  /** Nada carregado e nada mais por vir — household sem dados no mês. */
  isEmpty = computed(
    () =>
      !this.loading() &&
      this.data.transactions().length === 0 &&
      this.data.incomes().length === 0 &&
      this.data.fixed().length === 0 &&
      this.data.goals().length === 0,
  );

  monthLabel = computed(() => this.data.currentMonth().label);

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
