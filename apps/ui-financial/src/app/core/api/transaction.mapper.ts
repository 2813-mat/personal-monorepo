import type { Transaction, Holder } from '@caixa-familia/shared-types';
import type { TransactionWire, CreateTransactionWire } from './wire.types';

export function wireToTransaction(w: TransactionWire): Transaction {
  return {
    id: w.id,
    date: w.date,
    label: w.label,
    value: w.value,
    cat: w.categorySlug,
    holder: w.holder as Holder,
    method: w.method === 'CARD' && w.cardId ? w.cardId : 'pix',
    installments: w.installments,
    note: w.note,
    recurring: w.recurring,
    fixedRef: w.fixedExpenseId,
  };
}

export function transactionToCreateWire(t: Transaction): CreateTransactionWire {
  const isPix = t.method === 'pix';
  return {
    date: t.date,
    label: t.label,
    value: t.value,
    categorySlug: t.cat,
    holder: t.holder,
    method: isPix ? 'PIX' : 'CARD',
    cardId: isPix ? undefined : t.method,
    note: t.note,
    recurring: t.recurring,
    installments: t.installments ?? undefined,
  };
}
