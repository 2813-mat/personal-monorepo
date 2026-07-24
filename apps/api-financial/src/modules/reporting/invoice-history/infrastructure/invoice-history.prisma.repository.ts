import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { billingCycleFor } from '../../../../shared-kernel/billing-cycle';
import { InvoiceHistoryRepository, InvoiceHistoryView } from '../domain/invoice-history.repository';
import { toView } from './invoice-history.mapper';

@Injectable()
export class InvoiceHistoryPrismaRepository
  extends TenantRepository
  implements InvoiceHistoryRepository
{
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findByCard(cardId: string): Promise<InvoiceHistoryView[]> {
    const rows = await this.prisma.invoiceHistory.findMany({
      where: this.scoped({ cardId }),
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
    return rows.map(toView);
  }

  async findAll(): Promise<InvoiceHistoryView[]> {
    const rows = await this.prisma.invoiceHistory.findMany({
      where: this.scoped(),
      orderBy: [{ cardId: 'asc' }, { year: 'asc' }, { month: 'asc' }],
    });
    return rows.map(toView);
  }

  async closeInvoice(cardId: string, year: number, month: number): Promise<InvoiceHistoryView> {
    const card = await this.prisma.card.findFirst({ where: this.scoped({ id: cardId }) });
    if (!card) throw new NotFoundException(`Cartão ${cardId} não encontrado`);

    // Ciclo que fecha no mês alvo: ancoramos a referência no dia de fechamento desse mês.
    const { start, end } = billingCycleFor(card.closingDay, new Date(year, month - 1, card.closingDay));

    const transactions = await this.prisma.transaction.findMany({
      where: {
        householdId: this.householdId,
        cardId,
        method: 'CARD',
        date: { gt: start, lte: end },
      },
      include: { category: true },
    });
    const total = transactions.reduce((s, t) => s + Number(t.value), 0);
    const perCategory: Record<string, number> = {};
    for (const t of transactions) {
      perCategory[t.category.slug] = (perCategory[t.category.slug] ?? 0) + Number(t.value);
    }

    // Vencimento no mês do fechamento, ou no mês seguinte quando dueDay < closingDay.
    const dueMonthOffset = card.dueDay < card.closingDay ? 1 : 0;
    const dueDate = new Date(end.getFullYear(), end.getMonth() + dueMonthOffset, card.dueDay);

    const row = await this.prisma.invoiceHistory.upsert({
      where: { householdId_cardId_year_month: { householdId: this.householdId, cardId, year, month } },
      create: {
        householdId: this.householdId,
        cardId,
        year,
        month,
        closingDate: end,
        dueDate,
        total,
        perCategory: perCategory as Prisma.InputJsonValue,
        status: 'CLOSED',
      },
      update: {
        closingDate: end,
        dueDate,
        total,
        perCategory: perCategory as Prisma.InputJsonValue,
        status: 'CLOSED',
      },
    });
    return toView(row);
  }
}
