import { Prisma } from '@prisma/client';
import { Income } from '../domain/income.entity';

export type IncomeRow = Prisma.IncomeGetPayload<{ include: { member: true } }>;

export const toDomain = (r: IncomeRow): Income =>
  new Income({
    id: r.id,
    label: r.label,
    holder: r.member?.name ?? 'shared',
    value: Number(r.value),
    date: r.date.toISOString().slice(0, 10),
    recurring: r.recurring,
  });
