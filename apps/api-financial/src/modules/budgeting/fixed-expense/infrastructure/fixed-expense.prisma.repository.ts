import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import {
  CreateFixedExpenseData,
  FixedExpenseRepository,
  FixedExpenseView,
} from '../domain/fixed-expense.repository';
import { toView } from './fixed-expense.mapper';

@Injectable()
export class FixedExpensePrismaRepository extends TenantRepository implements FixedExpenseRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAllWithStatus(year: number, month: number): Promise<FixedExpenseView[]> {
    const rows = await this.prisma.fixedExpense.findMany({
      where: this.scoped(),
      include: { category: true },
      orderBy: { dueDay: 'asc' },
    });
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return Promise.all(
      rows.map(async (f) => {
        const paid = await this.prisma.transaction.count({
          where: { householdId: this.householdId, fixedExpenseId: f.id, date: { gte: start, lt: end } },
        });
        return toView(f, paid > 0);
      }),
    );
  }

  async create(data: CreateFixedExpenseData): Promise<FixedExpenseView> {
    const category = await this.prisma.category.findFirstOrThrow({
      where: { householdId: this.householdId, slug: data.categorySlug },
    });
    const row = await this.prisma.fixedExpense.create({
      data: {
        householdId: this.householdId,
        categoryId: category.id,
        memberId: data.memberId ?? undefined,
        label: data.label,
        value: data.value,
        dueDay: data.dueDay,
      },
      include: { category: true },
    });
    return toView(row, false);
  }
}
