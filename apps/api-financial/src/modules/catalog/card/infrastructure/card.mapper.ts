import { Card as PrismaCard } from '@prisma/client';
import { holderFrom } from '../../../../shared-kernel/holder-member';
import { Card } from '../domain/card.entity';

type CardRow = PrismaCard & { owner?: { name: string } | null };

export const toDomain = (r: CardRow, current: number): Card =>
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
    holder: holderFrom(r.owner?.name),
    archived: r.archivedAt !== null,
  });
