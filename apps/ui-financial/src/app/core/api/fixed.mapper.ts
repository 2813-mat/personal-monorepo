import type {
  FixedExpense,
  Holder,
  IsoDate,
  PaymentMethod,
} from '@caixa-familia/shared-types';
import type {
  FixedExpenseWire,
  CreateFixedExpenseWire,
  UpdateFixedExpenseWire,
  PayFixedExpenseWire,
} from './wire.types';

/** O que a tela coleta para quitar um fixo. `value` ausente = o do cadastro. */
export interface FixedPayment {
  date: IsoDate;
  value?: number;
  method: PaymentMethod;
}

export function wireToFixed(w: FixedExpenseWire): FixedExpense {
  return {
    id: w.id,
    label: w.label,
    value: w.value,
    due: w.dueDay,
    cat: w.categorySlug,
    holder: w.holder as Holder,
    startDate: w.startDate,
    paidAt: w.paidAt,
    paidValue: w.paidValue,
  };
}

/** `paidAt`/`paidValue` ficam de fora: pagamento tem endpoint próprio. */
export function fixedToUpdateWire(f: FixedExpense): UpdateFixedExpenseWire {
  return {
    label: f.label,
    value: f.value,
    dueDay: f.due,
    categorySlug: f.cat,
    holder: f.holder,
    startDate: f.startDate,
  };
}

export function fixedToCreateWire(f: FixedExpense): CreateFixedExpenseWire {
  return {
    label: f.label,
    value: f.value,
    dueDay: f.due,
    categorySlug: f.cat,
    holder: f.holder,
    // Vazio = deixa o servidor usar o mês corrente. Mandar '' quebraria o
    // IsDateString do DTO em vez de cair no default.
    startDate: f.startDate || undefined,
  };
}

/** `method` na UI é o id do cartão ou `'pix'`; o wire separa tipo e cartão. */
export function fixedPaymentToWire(p: FixedPayment): PayFixedExpenseWire {
  const isPix = p.method === 'pix';
  return {
    date: p.date,
    value: p.value,
    method: isPix ? 'PIX' : 'CARD',
    cardId: isPix ? undefined : p.method,
  };
}
