import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { MonthlySummaryRepository, MonthlySummaryView } from '../domain/monthly-summary.repository';
import { toView } from './monthly-summary.mapper';

@Injectable()
export class MonthlySummaryPrismaRepository
  extends TenantRepository
  implements MonthlySummaryRepository
{
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll(): Promise<MonthlySummaryView[]> {
    const rows = await this.prisma.monthlySummary.findMany({
      where: this.scoped(),
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
    return rows.map(toView);
  }

  async closeMonth(year: number, month: number): Promise<MonthlySummaryView> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: { householdId: this.householdId, date: { gte: start, lt: end } },
      include: { category: true },
    });
    const expenseTotal = transactions.reduce((s, t) => s + Number(t.value), 0);
    const perCategory: Record<string, number> = {};
    for (const t of transactions) {
      perCategory[t.category.slug] = (perCategory[t.category.slug] ?? 0) + Number(t.value);
    }

    const incomeAgg = await this.prisma.income.aggregate({
      _sum: { value: true },
      where: { householdId: this.householdId, date: { gte: start, lt: end } },
    });
    const incomeTotal = Number(incomeAgg._sum.value ?? 0);

    const row = await this.prisma.monthlySummary.upsert({
      where: { householdId_year_month: { householdId: this.householdId, year, month } },
      create: {
        householdId: this.householdId,
        year,
        month,
        expenseTotal,
        incomeTotal,
        perCategory: perCategory as Prisma.InputJsonValue,
        closed: true,
      },
      update: {
        expenseTotal,
        incomeTotal,
        perCategory: perCategory as Prisma.InputJsonValue,
        closed: true,
      },
    });
    return toView(row);
  }
}
