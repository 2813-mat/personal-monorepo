import { Prisma } from '@prisma/client';
import { TransactionView } from '../domain/transaction.repository';

export type TransactionRow = Prisma.TransactionGetPayload<{
  include: { category: true; installment: { include: { plan: true } } };
}>;

export const toView = (r: TransactionRow): TransactionView => ({
  id: r.id,
  date: r.date.toISOString().slice(0, 10),
  label: r.label,
  value: Number(r.value),
  categorySlug: r.category.slug,
  memberId: r.memberId,
  method: r.method,
  cardId: r.cardId,
  note: r.note ?? undefined,
  recurring: r.recurring,
  fixedExpenseId: r.fixedExpenseId ?? undefined,
  installments: r.installment ? { n: r.installment.number, of: r.installment.plan.totalCount } : null,
});
