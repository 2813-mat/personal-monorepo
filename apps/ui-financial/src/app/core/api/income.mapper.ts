import type { Income, Holder, RecurringIncome } from '@caixa-familia/shared-types';
import type {
  IncomeWire,
  CreateIncomeWire,
  UpdateIncomeWire,
  RecurringIncomeWire,
  CreateRecurringIncomeWire,
  UpdateRecurringIncomeWire,
} from './wire.types';

export function wireToIncome(w: IncomeWire): Income {
  return {
    id: w.id,
    label: w.label,
    holder: w.holder as Holder,
    value: w.value,
    date: w.date,
    recurring: w.recurring,
    recurringIncomeId: w.recurringIncomeId,
  };
}

export function incomeToCreateWire(i: Income): CreateIncomeWire {
  return {
    label: i.label,
    holder: i.holder,
    value: i.value,
    date: i.date,
    recurring: i.recurring,
  };
}

/** O PATCH não mexe em recurring nem no vínculo com o template. */
export function incomeToUpdateWire(i: Income): UpdateIncomeWire {
  return {
    label: i.label,
    holder: i.holder,
    value: i.value,
    date: i.date,
  };
}

export function wireToRecurringIncome(w: RecurringIncomeWire): RecurringIncome {
  return {
    id: w.id,
    label: w.label,
    holder: w.holder as Holder,
    value: w.value,
    day: w.day,
    startDate: w.startDate,
  };
}

/** `startDate` fica de fora: o backend começa no mês corrente por padrão. */
export function recurringIncomeToCreateWire(r: RecurringIncome): CreateRecurringIncomeWire {
  return {
    label: r.label,
    holder: r.holder,
    value: r.value,
    day: r.day,
  };
}

export function recurringIncomeToUpdateWire(r: RecurringIncome): UpdateRecurringIncomeWire {
  return {
    label: r.label,
    holder: r.holder,
    value: r.value,
    day: r.day,
  };
}
