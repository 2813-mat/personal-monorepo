import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import {
  CreateTransactionData,
  TransactionRepository,
  TransactionView,
  TxFilter,
  UpdateTransactionData,
} from '../domain/transaction.repository';
import { resolveHolderMemberId } from '../../../../shared-kernel/holder-member';
import { toView } from './transaction.mapper';
import { normalizeMethodFilter } from './method-filter';

const INCLUDE = { category: true, member: true, installment: { include: { plan: true } } } as const;

@Injectable()
export class TransactionPrismaRepository extends TenantRepository implements TransactionRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll(filter: TxFilter): Promise<TransactionView[]> {
    const where: Prisma.TransactionWhereInput = { householdId: this.householdId };
    if (filter.year && filter.month) {
      where.date = {
        gte: new Date(filter.year, filter.month - 1, 1),
        lt: new Date(filter.year, filter.month, 1),
      };
    }
    if (filter.categorySlug) where.category = { slug: filter.categorySlug };
    const method = normalizeMethodFilter(filter.method);
    if (method) where.method = method;
    if (filter.holder && filter.holder !== 'todos') {
      if (filter.holder === 'shared') where.memberId = null;
      else where.member = { name: filter.holder };
    }
    const rows = await this.prisma.transaction.findMany({
      where,
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
    return rows.map(toView);
  }

  async create(data: CreateTransactionData): Promise<TransactionView> {
    const row = await this.prisma.$transaction(async (tx) => {
      const category = await tx.category.findFirstOrThrow({
        where: { householdId: this.householdId, slug: data.categorySlug },
      });
      const memberId = await resolveHolderMemberId(tx, this.householdId, data.holder);
      let installmentId: string | undefined;
      if (data.installments) {
        const plan = await tx.installmentPlan.create({
          data: {
            householdId: this.householdId,
            totalCount: data.installments.of,
            totalAmount: new Prisma.Decimal(data.value).times(data.installments.of),
            description: data.label,
          },
        });
        const inst = await tx.installment.create({
          data: {
            householdId: this.householdId,
            planId: plan.id,
            number: data.installments.n,
            dueDate: new Date(data.date),
            amount: data.value,
            status: 'PENDING',
          },
        });
        installmentId = inst.id;
      }
      return tx.transaction.create({
        data: {
          householdId: this.householdId,
          date: new Date(data.date),
          label: data.label,
          value: data.value,
          categoryId: category.id,
          memberId,
          method: data.method,
          cardId: data.cardId ?? undefined,
          note: data.note,
          recurring: data.recurring ?? false,
          fixedExpenseId: data.fixedExpenseId,
          installmentId,
        },
        include: INCLUDE,
      });
    });
    return toView(row);
  }

  async update(id: string, data: UpdateTransactionData): Promise<TransactionView | null> {
    const existing = await this.prisma.transaction.findFirst({ where: this.scoped({ id }) });
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
    const memberId = await resolveHolderMemberId(this.prisma, this.householdId, data.holder);

    // Parcelamento fica de fora: vive em InstallmentPlan/Installment e é fatia própria.
    const row = await this.prisma.transaction.update({
      where: { id: existing.id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        label: data.label,
        value: data.value,
        categoryId,
        memberId,
        method: data.method,
        cardId: data.cardId,
        note: data.note,
        reviewed: data.reviewed,
      },
      include: INCLUDE,
    });
    return toView(row);
  }

  async remove(id: string): Promise<boolean> {
    // deleteMany mantém o escopo de household no where; o count diz se apagou.
    const { count } = await this.prisma.transaction.deleteMany({ where: this.scoped({ id }) });
    return count > 0;
  }
}
