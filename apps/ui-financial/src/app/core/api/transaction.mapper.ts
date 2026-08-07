import type { Transaction, Holder } from '@caixa-familia/shared-types';
import type { TransactionWire, CreateTransactionWire, UpdateTransactionWire } from './wire.types';

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
    reviewed: w.reviewed,
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

/**
 * Manda o objeto inteiro: o PATCH aceita todos estes campos, e diferenciar o
 * que mudou seria complexidade sem ganho numa base deste tamanho.
 * `installments` fica de fora — o backend não aceita alterá-lo.
 */
export function transactionToUpdateWire(t: Transaction): UpdateTransactionWire {
  const isPix = t.method === 'pix';
  return {
    date: t.date,
    label: t.label,
    value: t.value,
    categorySlug: t.cat,
    holder: t.holder,
    method: isPix ? 'PIX' : 'CARD',
    cardId: isPix ? null : t.method,
    note: t.note,
    reviewed: t.reviewed,
  };
}
