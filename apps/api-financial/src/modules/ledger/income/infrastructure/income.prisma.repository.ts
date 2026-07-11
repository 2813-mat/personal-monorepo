import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { CreateIncomeData, IncomeRepository } from '../domain/income.repository';
import { toDomain } from './income.mapper';

const INCLUDE = { member: true } as const;

@Injectable()
export class IncomePrismaRepository extends TenantRepository implements IncomeRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll() {
    const rows = await this.prisma.income.findMany({
      where: this.scoped(),
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
    return rows.map(toDomain);
  }

  async create(data: CreateIncomeData) {
    let memberId: string | undefined;
    if (data.holder && data.holder !== 'shared') {
      const member = await this.prisma.member.findFirst({
        where: { householdId: this.householdId, name: data.holder },
      });
      memberId = member?.id;
    }
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
}
