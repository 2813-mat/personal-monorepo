import type { FixedExpense, Holder } from '@caixa-familia/shared-types';
import type {
  FixedExpenseWire,
  CreateFixedExpenseWire,
  UpdateFixedExpenseWire,
} from './wire.types';

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

/** `paidThisMonth` fica de fora: deriva dos lançamentos do mês, não é editável. */
export function fixedToUpdateWire(f: FixedExpense): UpdateFixedExpenseWire {
  return {
    label: f.label,
    value: f.value,
    dueDay: f.due,
    categorySlug: f.cat,
    holder: f.holder,
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
