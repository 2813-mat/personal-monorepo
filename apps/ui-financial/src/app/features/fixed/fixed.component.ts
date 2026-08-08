import { Component, inject, computed, signal } from '@angular/core';
import type { FixedExpense } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { FixedEditDrawerComponent } from './fixed-edit-drawer.component';
import { FixedPayDrawerComponent } from './fixed-pay-drawer.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal/confirm-modal.component';

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

@Component({
  selector: 'cf-fixed',
  standalone: true,
  imports: [
    MoneyComponent,
    AvatarComponent,
    CatDotComponent,
    IconComponent,
    ProgressBarComponent,
    FixedEditDrawerComponent,
    FixedPayDrawerComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './fixed.component.html',
  styleUrl: './fixed.component.scss',
})
export class FixedComponent {
  protected data = inject(AppDataService);
  protected vp = inject(ViewportService);
  protected auth = inject(AuthService);

  protected editingFixed = signal<FixedExpense | null>(null);
  protected payingFixed = signal<FixedExpense | null>(null);

  readonly confirmingRemoval = signal<string | null>(null);
  readonly confirmingUnpay = signal<FixedExpense | null>(null);

  askRemove(id: string): void {
    this.confirmingRemoval.set(id);
  }

  confirmRemove(): void {
    const id = this.confirmingRemoval();
    if (id) this.data.removeFixed(id);
    this.confirmingRemoval.set(null);
  }

  cancelRemove(): void {
    this.confirmingRemoval.set(null);
  }

  askUnpay(f: FixedExpense): void {
    this.confirmingUnpay.set(f);
  }

  confirmUnpay(): void {
    const f = this.confirmingUnpay();
    if (f) this.data.unpayFixed(f.id);
    this.confirmingUnpay.set(null);
  }

  cancelUnpay(): void {
    this.confirmingUnpay.set(null);
  }

  pendingItems = computed(() =>
    this.data.fixed()
      .filter(f => !f.paidAt)
      .sort((a, b) => a.due - b.due)
  );

  /** Ordenado pela data do pagamento: é essa a coluna que a tabela mostra. */
  paidItems = computed(() =>
    this.data.fixed()
      .filter(f => f.paidAt)
      .sort((a, b) => (a.paidAt ?? '').localeCompare(b.paidAt ?? ''))
  );

  totalFixed = computed(() => this.data.fixed().reduce((s, f) => s + f.value, 0));
  /** O que de fato saiu, que pode divergir do cadastro. */
  totalPaid = computed(() =>
    this.paidItems().reduce((s, f) => s + (f.paidValue ?? f.value), 0)
  );
  totalPending = computed(() => this.pendingItems().reduce((s, f) => s + f.value, 0));

  /**
   * "Vence em N dias" só faz sentido no mês corrente. Navegando para setembro,
   * comparar o dia de vencimento com o dia de hoje marcaria contas de setembro
   * como vencidas — a página passou a ser navegável por mês, e isso apareceria.
   */
  isCurrentMonth = computed(() => {
    const now = new Date();
    const { year, month } = this.data.currentMonth();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  });

  upcoming7 = computed(() => {
    if (!this.isCurrentMonth()) return 0;
    const today = new Date().getDate();
    return this.pendingItems().filter(f => f.due >= today && f.due <= today + 7).length;
  });

  pctReceita = computed(() => {
    const totalIncome = this.data.incomes().reduce((s, i) => s + i.value, 0);
    return totalIncome > 0 ? this.totalFixed() / totalIncome : 0;
  });

  formatPercent(ratio: number): string {
    return Math.round(ratio * 100) + '%';
  }

  /** Dia de vencimento no mês que está sendo visto — não num mês fixo no código. */
  formatDay(due: number): string {
    const { month } = this.data.currentMonth();
    return `${String(due).padStart(2, '0')}/${MONTHS[month - 1]}`;
  }

  /** `'2026-08-06'` → `'06/ago'`, lido como data civil e não como UTC. */
  formatPaidAt(iso: string): string {
    const [, month, day] = iso.split('-');
    return `${day}/${MONTHS[Number(month) - 1]}`;
  }

  /** Verdadeiro quando o valor pago divergiu do cadastro. */
  valueDiverged(f: FixedExpense): boolean {
    return f.paidValue !== undefined && f.paidValue !== f.value;
  }

  daysAway(due: number): number {
    return due - new Date().getDate();
  }

  formatDaysAway(due: number): string {
    const d = this.daysAway(due);
    return d < 0 ? `${Math.abs(d)}d atrás` : `${d}d`;
  }

  catLabel(catId: string): string {
    return this.data.catBy()[catId]?.label ?? catId;
  }
}
