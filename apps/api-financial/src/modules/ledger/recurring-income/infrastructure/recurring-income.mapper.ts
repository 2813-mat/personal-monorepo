import { Prisma } from '@prisma/client';
import { holderFrom } from '../../../../shared-kernel/holder-member';
import { RecurringIncome } from '../domain/recurring-income.entity';

export type RecurringIncomeRow = Prisma.RecurringIncomeGetPayload<{ include: { member: true } }>;

export const toDomain = (r: RecurringIncomeRow): RecurringIncome =>
  new RecurringIncome({
    id: r.id,
    label: r.label,
    holder: holderFrom(r.member?.name),
    value: Number(r.value),
    day: r.day,
    startDate: r.startDate.toISOString().slice(0, 10),
  });
