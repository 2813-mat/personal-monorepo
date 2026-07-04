import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { billingCycleFor } from '../../../../shared-kernel/billing-cycle';
import { CardRepository, OpenInvoice } from '../domain/card.repository';
import { toDomain } from './card.mapper';

@Injectable()
export class CardPrismaRepository extends TenantRepository implements CardRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll() {
    const cards = await this.prisma.card.findMany({ where: this.scoped(), orderBy: { name: 'asc' } });
    return Promise.all(
      cards.map(async (c) => {
        const { start, end } = billingCycleFor(c.closingDay);
        const agg = await this.prisma.transaction.aggregate({
          _sum: { value: true },
          where: { householdId: this.householdId, cardId: c.id, date: { gt: start, lte: end } },
        });
        return toDomain(c, Number(agg._sum.value ?? 0));
      }),
    );
  }

  async openInvoice(cardId: string): Promise<OpenInvoice> {
    const card = await this.prisma.card.findFirst({ where: this.scoped({ id: cardId }) });
    if (!card) throw new NotFoundException(`Cartão ${cardId} não encontrado`);
    const { start, end } = billingCycleFor(card.closingDay);
    const items = await this.prisma.transaction.findMany({
      where: { householdId: this.householdId, cardId, date: { gt: start, lte: end } },
      include: { category: true },
      orderBy: { date: 'desc' },
    });
    const total = items.reduce((s, t) => s + Number(t.value), 0);
    return {
      total,
      items: items.map((t) => ({
        id: t.id,
        date: t.date.toISOString().slice(0, 10),
        label: t.label,
        value: Number(t.value),
        categorySlug: t.category.slug,
      })),
    };
  }
}
