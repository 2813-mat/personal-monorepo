import { Injectable, inject, signal } from '@angular/core';
import type { FixedExpense } from '@caixa-familia/shared-types';
import { FixedApiService } from '../api/fixed-api.service';
import { wireToFixed, fixedToCreateWire, fixedToUpdateWire } from '../api/fixed.mapper';
import { FailureReporter } from './failure.reporter';
import { ViewContextService } from './view-context.service';

@Injectable({ providedIn: 'root' })
export class FixedStore {
  private api = inject(FixedApiService);
  private failure = inject(FailureReporter);
  private view = inject(ViewContextService);

  readonly fixed = signal<FixedExpense[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  load(): void {
    const { year, month } = this.view.currentMonth();
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ year, month }).subscribe({
      next: (rows) => {
        this.fixed.set(rows.map(wireToFixed));
        this.loading.set(false);
      },
      error: () => {
        this.failure.report('Falha ao carregar gastos fixos', this.error);
        this.loading.set(false);
      },
    });
  }

  create(f: FixedExpense): void {
    this.api.create(fixedToCreateWire(f)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao criar gasto fixo', this.error),
    });
  }

  update(f: FixedExpense): void {
    this.api.update(f.id, fixedToUpdateWire(f)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao salvar gasto fixo', this.error),
    });
  }

  remove(id: string): void {
    this.api.remove(id).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao remover gasto fixo', this.error),
    });
  }
}
