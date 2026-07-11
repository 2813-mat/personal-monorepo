import type { Income, Holder } from '@caixa-familia/shared-types';
import type { IncomeWire, CreateIncomeWire } from './wire.types';

export function wireToIncome(w: IncomeWire): Income {
  return {
    id: w.id,
    label: w.label,
    holder: w.holder as Holder,
    value: w.value,
    date: w.date,
    recurring: w.recurring,
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
