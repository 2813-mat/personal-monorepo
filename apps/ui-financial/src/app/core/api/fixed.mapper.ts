import type { FixedExpense, Holder } from '@caixa-familia/shared-types';
import type { FixedExpenseWire, CreateFixedExpenseWire } from './wire.types';

export function wireToFixed(w: FixedExpenseWire): FixedExpense {
  return {
    id: w.id,
    label: w.label,
    value: w.value,
    due: w.dueDay,
    cat: w.categorySlug,
    holder: w.holder as Holder,
    paidThisMonth: w.paidThisMonth,
  };
}

export function fixedToCreateWire(f: FixedExpense): CreateFixedExpenseWire {
  return {
    label: f.label,
    value: f.value,
    dueDay: f.due,
    categorySlug: f.cat,
    holder: f.holder,
  };
}
