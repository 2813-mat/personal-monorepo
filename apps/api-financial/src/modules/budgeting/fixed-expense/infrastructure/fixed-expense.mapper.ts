import { Prisma } from '@prisma/client';
import { FixedExpenseView } from '../domain/fixed-expense.repository';

export type FixedExpenseRow = Prisma.FixedExpenseGetPayload<{ include: { category: true } }>;

export const toView = (r: FixedExpenseRow, paidThisMonth: boolean): FixedExpenseView => ({
  id: r.id,
  label: r.label,
  value: Number(r.value),
  dueDay: r.dueDay,
  categorySlug: r.category.slug,
  memberId: r.memberId,
  paidThisMonth,
});
