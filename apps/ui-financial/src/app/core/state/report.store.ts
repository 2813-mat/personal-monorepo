import { Injectable, inject, signal } from '@angular/core';
import { ReportApiService } from '../api/report-api.service';
import {
  wireToExpenseHistory,
  wireToIncomeHistory,
  type MonthEntry,
} from '../api/report.mapper';
import { FailureReporter } from './failure.reporter';

@Injectable({ providedIn: 'root' })
export class ReportStore {
  private api = inject(ReportApiService);
  private failure = inject(FailureReporter);

  readonly history = signal<MonthEntry[]>([]);
  readonly incomeHistory = signal<MonthEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Série de meses fechados. Uma chamada alimenta as duas projeções — despesa e
   * receita saem do mesmo summary.
   */
  loadMonthlyHistory(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listMonthly().subscribe({
      next: (rows) => {
        this.history.set(wireToExpenseHistory(rows));
        this.incomeHistory.set(wireToIncomeHistory(rows));
        this.loading.set(false);
      },
      error: () => {
        this.failure.report('Falha ao carregar o histórico mensal', this.error);
        this.loading.set(false);
      },
    });
  }

  /**
   * Fecha o mês (admin). O backend faz upsert: refazer recalcula em vez de
   * duplicar. Invalida a série de meses fechados.
   */
  closeMonth(year: number, month: number): void {
    this.api.closeMonth(year, month).subscribe({
      next: () => this.loadMonthlyHistory(),
      error: () => this.failure.report('Falha ao fechar o mês', this.error),
    });
  }
}
