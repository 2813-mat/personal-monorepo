import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import {
  CreateRecurringIncomeData,
  RecurringIncomeRepository,
  UpdateRecurringIncomeData,
} from '../domain/recurring-income.repository';
import { toDomain } from './recurring-income.mapper';
import { monthStartOfIso } from '../../income/infrastructure/materialization';

const INCLUDE = { member: true } as const;

@Injectable()
export class RecurringIncomePrismaRepository
  extends TenantRepository
  implements RecurringIncomeRepository
{
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll() {
    const rows = await this.prisma.recurringIncome.findMany({
      where: this.scoped(),
      include: INCLUDE,
      orderBy: { day: 'asc' },
    });
    return rows.map(toDomain);
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

  async create(data: CreateRecurringIncomeData) {
    const memberId = await this.memberIdFor(data.holder);
    // O primeiro dia do mês é a granularidade real: o template gera a partir
    // daquele mês, não daquele dia.
    const hoje = new Date();
    const startDate = data.startDate
      ? monthStartOfIso(data.startDate)
      : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const row = await this.prisma.recurringIncome.create({
      data: {
        householdId: this.householdId,
        memberId,
        label: data.label,
        value: data.value,
        day: data.day,
        startDate,
      },
      include: INCLUDE,
    });
    return toDomain(row);
  }

  /**
   * Um aumento vale daqui para a frente: as linhas já materializadas continuam
   * com o valor antigo, que é o que o mês fechado de fato recebeu.
   */
  async update(id: string, data: UpdateRecurringIncomeData) {
    const existing = await this.prisma.recurringIncome.findFirst({ where: this.scoped({ id }) });
    if (!existing) return null;
    const memberId = await this.memberIdFor(data.holder);
    const row = await this.prisma.recurringIncome.update({
      where: { id: existing.id },
      data: {
        label: data.label,
        value: data.value,
        day: data.day,
        memberId,
      },
      include: INCLUDE,
    });
    return toDomain(row);
  }

  /**
   * O salário acabou, mas os meses em que ele existiu não. A FK é `SET NULL`,
   * então as linhas já geradas sobrevivem soltas em vez de sumirem do histórico.
   */
  async remove(id: string): Promise<boolean> {
    const existing = await this.prisma.recurringIncome.findFirst({ where: this.scoped({ id }) });
    if (!existing) return false;
    await this.prisma.recurringIncome.delete({ where: { id: existing.id } });
    return true;
  }
}
