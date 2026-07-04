import { Card as PrismaCard } from '@prisma/client';
import { Card } from '../domain/card.entity';

export const toDomain = (r: PrismaCard, current: number): Card =>
  new Card({
    id: r.id,
    name: r.name,
    bank: r.bank,
    color: r.color,
    closingDay: r.closingDay,
    dueDay: r.dueDay,
    creditLimit: Number(r.creditLimit),
    last4: r.last4,
    ownerMemberId: r.ownerMemberId,
    current,
  });
