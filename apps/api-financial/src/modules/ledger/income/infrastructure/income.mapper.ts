import { Income as PrismaIncome } from '@prisma/client';
import { Income } from '../domain/income.entity';

export const toDomain = (r: PrismaIncome): Income =>
  new Income({
    id: r.id,
    label: r.label,
    memberId: r.memberId,
    value: Number(r.value),
    date: r.date.toISOString().slice(0, 10),
    recurring: r.recurring,
  });
