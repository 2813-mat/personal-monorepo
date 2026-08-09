import { Prisma } from '@prisma/client';
import { holderFrom } from '../../../../shared-kernel/holder-member';
import { FixedExpenseView } from '../domain/fixed-expense.repository';

export type FixedExpenseRow = Prisma.FixedExpenseGetPayload<{
  include: { category: true; member: true };
}>;

/** O lançamento que quitou o fixo no mês consultado, quando houver. */
export interface FixedExpensePayment {
  date: Date;
  value: number;
}

export const toView = (
  r: FixedExpenseRow,
  payment: FixedExpensePayment | null,
): FixedExpenseView => ({
  id: r.id,
  label: r.label,
  value: Number(r.value),
  dueDay: r.dueDay,
  categorySlug: r.category.slug,
  holder: holderFrom(r.member?.name),
  startDate: r.startDate.toISOString().slice(0, 10),
  paidAt: payment?.date.toISOString().slice(0, 10),
  paidValue: payment?.value,
});
