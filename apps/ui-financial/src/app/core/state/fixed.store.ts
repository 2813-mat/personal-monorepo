import { Injectable, inject, signal } from '@angular/core';
import type { FixedExpense } from '@caixa-familia/shared-types';
import { FixedApiService } from '../api/fixed-api.service';
import {
  wireToFixed,
  fixedToCreateWire,
  fixedToUpdateWire,
  fixedPaymentToWire,
  type FixedPayment,
} from '../api/fixed.mapper';
import { fixedPaymentErrorMessage } from '../api/fixed-payment-error';
import { FailureReporter } from './failure.reporter';
import { TransactionStore } from './transaction.store';
import { ViewContextService } from './view-context.service';

@Injectable({ providedIn: 'root' })
export class FixedStore {
  private api = inject(FixedApiService);
  private failure = inject(FailureReporter);
  private view = inject(ViewContextService);
  /**
   * Pagar e desfazer criam e apagam lançamentos, então os dois recursos mudam
   * na mesma ação. Sem recarregar as transações o dashboard tiraria o fixo dos
   * pendentes antes de ver a transação que o substitui, e o gasto do mês
   * afundaria pelo valor da conta até a próxima leitura.
   */
  private tx = inject(TransactionStore);

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

  pay(id: string, payment: FixedPayment): void {
    this.api.pay(id, fixedPaymentToWire(payment)).subscribe({
      next: () => this.reloadMonth(),
      error: (err) => this.failure.report(fixedPaymentErrorMessage(err), this.error),
    });
  }

  unpay(id: string): void {
    const { year, month } = this.view.currentMonth();
    this.api.unpay(id, { year, month }).subscribe({
      next: () => this.reloadMonth(),
      error: () => this.failure.report('Falha ao desfazer o pagamento', this.error),
    });
  }

  private reloadMonth(): void {
    this.load();
    this.tx.load();
  }

  remove(id: string): void {
    this.api.remove(id).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao remover gasto fixo', this.error),
    });
  }
}
