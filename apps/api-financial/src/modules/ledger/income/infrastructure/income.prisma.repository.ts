import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import {
  CreateIncomeData,
  IncomeFilter,
  IncomeRepository,
  UpdateIncomeData,
} from '../domain/income.repository';
import { toDomain } from './income.mapper';
import { monthStart, occurrenceDate, pendingMonths } from './materialization';

const INCLUDE = { member: true } as const;

@Injectable()
export class IncomePrismaRepository extends TenantRepository implements IncomeRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll(filter: IncomeFilter) {
    if (filter.year && filter.month) {
      await this.materializeRecurring(filter.year, filter.month);
    }
    const where: Prisma.IncomeWhereInput = { householdId: this.householdId };
    if (filter.year && filter.month) {
      where.date = {
        gte: monthStart(filter.year, filter.month),
        lt: monthStart(filter.year, filter.month + 1),
      };
    }
    const rows = await this.prisma.income.findMany({
      where,
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
    return rows.map(toDomain);
  }

  /**
   * Gera as linhas que os templates devem ao mês pedido. É escrita dentro de
   * uma leitura, o que não é bonito, mas é o que faz o salário aparecer sozinho
   * ao virar o mês sem depender de um job agendado — que este backend não tem.
   *
   * O `skipDuplicates` cobre a corrida de duas abas abrindo o mesmo mês junto:
   * o unique [recurringIncomeId, date] transforma a segunda escrita em no-op.
   */
  private async materializeRecurring(year: number, month: number): Promise<void> {
    const templates = await this.prisma.recurringIncome.findMany({
      where: this.scoped({ startDate: { lt: monthStart(year, month + 1) } }),
    });

    for (const t of templates) {
      const meses = pendingMonths(t.startDate, t.materializedThrough, { year, month });
      if (meses.length === 0) continue;

      await this.prisma.income.createMany({
        data: meses.map((m) => ({
          householdId: this.householdId,
          memberId: t.memberId,
          label: t.label,
          value: t.value,
          date: occurrenceDate(m.year, m.month, t.day),
          recurring: true,
          recurringIncomeId: t.id,
        })),
        skipDuplicates: true,
      });

      const ultimo = meses[meses.length - 1];
      await this.prisma.recurringIncome.update({
        where: { id: t.id },
        data: { materializedThrough: monthStart(ultimo.year, ultimo.month) },
      });
    }
  }

  private async memberIdFor(holder: string | undefined): Promise<string | null | undefined> {
    if (holder === undefined) return undefined;
    if (holder === 'shared') return null;
    const member = await this.prisma.member.findFirst({
      where: { householdId: this.householdId, name: holder },
    });
    if (!member) throw new BadRequestException(`Membro ${holder} não existe`);
    return member.id;
  }

  async create(data: CreateIncomeData) {
    const memberId = await this.memberIdFor(data.holder);
    const row = await this.prisma.income.create({
      data: {
        householdId: this.householdId,
        label: data.label,
        memberId,
        value: data.value,
        date: new Date(data.date),
        recurring: data.recurring,
      },
      include: INCLUDE,
    });
    return toDomain(row);
  }

  /**
   * Edita a linha de um mês só. Um aumento de salário se faz no template, que
   * vale daqui para a frente; aqui é o ajuste pontual — o mês que veio com
   * bônus, a competência que caiu num dia diferente.
   */
  async update(id: string, data: UpdateIncomeData) {
    const existing = await this.prisma.income.findFirst({ where: this.scoped({ id }) });
    if (!existing) return null;
    const memberId = await this.memberIdFor(data.holder);
    const row = await this.prisma.income.update({
      where: { id: existing.id },
      data: {
        label: data.label,
        value: data.value,
        memberId,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: INCLUDE,
    });
    return toDomain(row);
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.prisma.income.findFirst({ where: this.scoped({ id }) });
    if (!existing) return false;
    await this.prisma.income.delete({ where: { id: existing.id } });
    return true;
  }
}
