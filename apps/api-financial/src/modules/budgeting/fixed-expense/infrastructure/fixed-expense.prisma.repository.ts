import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import {
  CreateFixedExpenseData,
  FixedExpenseRepository,
  FixedExpenseView,
  UpdateFixedExpenseData,
} from '../domain/fixed-expense.repository';
import { toView } from './fixed-expense.mapper';

const INCLUDE = { category: true, member: true } as const;

@Injectable()
export class FixedExpensePrismaRepository extends TenantRepository implements FixedExpenseRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAllWithStatus(year: number, month: number): Promise<FixedExpenseView[]> {
    const rows = await this.prisma.fixedExpense.findMany({
      where: this.scoped(),
      include: INCLUDE,
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
    let memberId: string | undefined;
    if (data.holder && data.holder !== 'shared') {
      const member = await this.prisma.member.findFirst({
        where: { householdId: this.householdId, name: data.holder },
      });
      memberId = member?.id;
    }
    const row = await this.prisma.fixedExpense.create({
      data: {
        householdId: this.householdId,
        categoryId: category.id,
        memberId,
        label: data.label,
        value: data.value,
        dueDay: data.dueDay,
      },
      include: INCLUDE,
    });
    return toView(row, false);
  }

  async update(
    id: string,
    data: UpdateFixedExpenseData,
    year: number,
    month: number,
  ): Promise<FixedExpenseView | null> {
    const existing = await this.prisma.fixedExpense.findFirst({ where: this.scoped({ id }) });
    if (!existing) return null;

    let categoryId: string | undefined;
    if (data.categorySlug) {
      const category = await this.prisma.category.findFirst({
        where: this.scoped({ slug: data.categorySlug }),
      });
      if (!category) throw new BadRequestException(`Categoria ${data.categorySlug} não existe`);
      categoryId = category.id;
    }

    // `holder` é nome no wire (convenção do umbrella §2.1); 'shared' = sem membro.
    let memberId: string | null | undefined;
    if (data.holder !== undefined) {
      if (data.holder === 'shared') {
        memberId = null;
      } else {
        const member = await this.prisma.member.findFirst({
          where: this.scoped({ name: data.holder }),
        });
        if (!member) throw new BadRequestException(`Membro ${data.holder} não existe`);
        memberId = member.id;
      }
    }

    const row = await this.prisma.fixedExpense.update({
      where: { id: existing.id },
      data: {
        label: data.label,
        value: data.value,
        dueDay: data.dueDay,
        categoryId,
        memberId,
      },
      include: INCLUDE,
    });
    const paid = await this.prisma.transaction.count({
      where: this.scoped({
        fixedExpenseId: row.id,
        date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
      }),
    });
    return toView(row, paid > 0);
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.prisma.fixedExpense.findFirst({ where: this.scoped({ id }) });
    if (!existing) return false;
    await this.prisma.$transaction(async (tx) => {
      // FK opcional: desvincula o histórico em vez de apagá-lo. Os lançamentos
      // continuam existindo, só deixam de estar marcados como "fixo".
      await tx.transaction.updateMany({
        where: this.scoped({ fixedExpenseId: id }),
        data: { fixedExpenseId: null },
      });
      await tx.fixedExpense.delete({ where: { id: existing.id } });
    });
    return true;
  }
}
