import { Prisma } from '@prisma/client';
import { holderFrom } from '../../../../shared-kernel/holder-member';
import { Income } from '../domain/income.entity';

export type IncomeRow = Prisma.IncomeGetPayload<{ include: { member: true } }>;

export const toDomain = (r: IncomeRow): Income =>
  new Income({
    id: r.id,
    label: r.label,
    holder: holderFrom(r.member?.name),
    value: Number(r.value),
    date: r.date.toISOString().slice(0, 10),
    recurring: r.recurring,
    recurringIncomeId: r.recurringIncomeId ?? undefined,
  });
