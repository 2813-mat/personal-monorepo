import { Component, computed, inject, signal } from '@angular/core';
import type { Income, RecurringIncome } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { ConfirmModalComponent } from '../../ui/confirm-modal/confirm-modal.component';
import { IncomeEditDrawerComponent } from './income-edit-drawer.component';
import { RecurringIncomeEditDrawerComponent } from './recurring-income-edit-drawer.component';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

@Component({
  selector: 'cf-incomes',
  standalone: true,
  imports: [
    MoneyComponent,
    AvatarComponent,
    IconComponent,
    ConfirmModalComponent,
    IncomeEditDrawerComponent,
    RecurringIncomeEditDrawerComponent,
  ],
  templateUrl: './incomes.component.html',
  styleUrl: './incomes.component.scss',
})
export class IncomesComponent {
  protected data = inject(AppDataService);
  protected vp = inject(ViewportService);
  protected auth = inject(AuthService);

  protected editingIncome = signal<Income | null>(null);
  /** `null` no signal é "fechado"; o modo criação usa o sinalizador à parte. */
  protected editingTemplate = signal<RecurringIncome | null>(null);
  protected creatingTemplate = signal(false);

  protected confirmingIncome = signal<string | null>(null);
  protected confirmingTemplate = signal<string | null>(null);

  doMes = computed(() =>
    [...this.data.incomes()].sort((a, b) => a.date.localeCompare(b.date)),
  );

  totalDoMes = computed(() => this.doMes().reduce((s, i) => s + i.value, 0));

  recorrentes = computed(() => [...this.data.recurringIncomes()].sort((a, b) => a.day - b.day));

  totalRecorrente = computed(() => this.recorrentes().reduce((s, r) => s + r.value, 0));

  /** O que entrou fora do salário: freela, bônus, venda. */
  totalAvulso = computed(() =>
    this.doMes()
      .filter((i) => !i.recurringIncomeId)
      .reduce((s, i) => s + i.value, 0),
  );

  openNewTemplate(): void {
    this.editingTemplate.set(null);
    this.creatingTemplate.set(true);
  }

  closeTemplateDrawer(): void {
    this.editingTemplate.set(null);
    this.creatingTemplate.set(false);
  }

  askRemoveIncome(id: string): void {
    this.confirmingIncome.set(id);
  }

  confirmRemoveIncome(): void {
    const id = this.confirmingIncome();
    if (id) this.data.removeIncome(id);
    this.confirmingIncome.set(null);
  }

  askRemoveTemplate(id: string): void {
    this.confirmingTemplate.set(id);
  }

  confirmRemoveTemplate(): void {
    const id = this.confirmingTemplate();
    if (id) this.data.removeRecurringIncome(id);
    this.confirmingTemplate.set(null);
  }

  formatDate(date: string): string {
    const [, m, d] = date.split('-');
    return `${d} ${MESES[Number(m) - 1]}`;
  }

  formatDay(day: number): string {
    return `dia ${day}`;
  }
}
