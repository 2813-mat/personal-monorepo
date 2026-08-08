import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import {
  CreateFixedExpenseData,
  FixedExpenseRepository,
  FixedExpenseView,
  PayFixedExpenseData,
  UpdateFixedExpenseData,
} from '../domain/fixed-expense.repository';
import { FixedExpensePayment, toView } from './fixed-expense.mapper';
import { isoMonth, isoYearMonth, monthStart } from './month-range';

const INCLUDE = { category: true, member: true } as const;

@Injectable()
export class FixedExpensePrismaRepository extends TenantRepository implements FixedExpenseRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAllWithStatus(year: number, month: number): Promise<FixedExpenseView[]> {
    const end = monthStart(year, month + 1);
    const rows = await this.prisma.fixedExpense.findMany({
      // Um fixo cadastrado em agosto não é dívida de julho.
      where: this.scoped({ startDate: { lt: end } }),
      include: INCLUDE,
      orderBy: { dueDay: 'asc' },
    });
    const payments = await this.paymentsOfMonth(year, month);
    return rows.map((f) => toView(f, payments.get(f.id) ?? null));
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
        startDate: this.startDateOrCurrentMonth(data.startDate),
      },
      include: INCLUDE,
    });
    return toView(row, null);
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
        startDate: data.startDate ? new Date(data.startDate) : undefined,
      },
      include: INCLUDE,
    });
    const payments = await this.paymentsOfMonth(year, month);
    return toView(row, payments.get(row.id) ?? null);
  }

  async pay(id: string, data: PayFixedExpenseData): Promise<FixedExpenseView | null> {
    const fixo = await this.prisma.fixedExpense.findFirst({
      where: this.scoped({ id }),
      include: INCLUDE,
    });
    if (!fixo) return null;

    const competencia = isoMonth(data.date);
    if (competencia < isoMonth(fixo.startDate.toISOString())) {
      throw new UnprocessableEntityException(
        `${fixo.label} só passa a ser devido em ${isoMonth(fixo.startDate.toISOString())}`,
      );
    }

    const { year, month } = isoYearMonth(data.date);
    const start = monthStart(year, month);
    const end = monthStart(year, month + 1);

    await this.prisma.$transaction(async (tx) => {
      // Re-checa dentro da transação: duas abas pagando o mesmo fixo juntas
      // duplicariam o lançamento, e a soma do mês passaria a contar duas vezes.
      const existing = await tx.transaction.findFirst({
        where: this.scoped({ fixedExpenseId: id, date: { gte: start, lt: end } }),
      });
      if (existing) {
        throw new ConflictException(`${fixo.label} já tem pagamento lançado em ${competencia}`);
      }
      await tx.transaction.create({
        data: {
          householdId: this.householdId,
          date: new Date(data.date),
          label: fixo.label,
          value: data.value ?? Number(fixo.value),
          categoryId: fixo.categoryId,
          memberId: fixo.memberId,
          method: data.method,
          cardId: data.cardId ?? undefined,
          recurring: true,
          fixedExpenseId: fixo.id,
        },
      });
    });

    const payments = await this.paymentsOfMonth(year, month);
    return toView(fixo, payments.get(fixo.id) ?? null);
  }

  async unpay(id: string, year: number, month: number): Promise<FixedExpenseView | null> {
    const fixo = await this.prisma.fixedExpense.findFirst({
      where: this.scoped({ id }),
      include: INCLUDE,
    });
    if (!fixo) return null;

    // Apaga o lançamento em vez de só desvincular: uma transação órfã com o
    // valor do aluguel continuaria somando no gasto do mês.
    await this.prisma.transaction.deleteMany({
      where: this.scoped({
        fixedExpenseId: id,
        date: { gte: monthStart(year, month), lt: monthStart(year, month + 1) },
      }),
    });
    return toView(fixo, null);
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

  /**
   * Os pagamentos de fixo do mês, indexados pelo fixo. Uma consulta para todos:
   * antes era um `count` por linha, que virava N+1 na listagem.
   */
  private async paymentsOfMonth(
    year: number,
    month: number,
  ): Promise<Map<string, FixedExpensePayment>> {
    const rows = await this.prisma.transaction.findMany({
      where: this.scoped({
        fixedExpenseId: { not: null },
        date: { gte: monthStart(year, month), lt: monthStart(year, month + 1) },
      }),
      select: { fixedExpenseId: true, date: true, value: true },
      orderBy: { date: 'asc' },
    });
    const out = new Map<string, FixedExpensePayment>();
    for (const r of rows) {
      // O `pay` garante um pagamento por mês, mas um lançamento manual antigo
      // pode ter furado a regra; o primeiro do mês é o que representa a quitação.
      if (!r.fixedExpenseId || out.has(r.fixedExpenseId)) continue;
      out.set(r.fixedExpenseId, { date: r.date, value: Number(r.value) });
    }
    return out;
  }

  /** Sem data informada, o fixo passa a valer do mês corrente em diante. */
  private startDateOrCurrentMonth(iso?: string): Date {
    if (iso) return new Date(iso);
    const now = new Date();
    return monthStart(now.getFullYear(), now.getMonth() + 1);
  }
}
