import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { CreateIncomeData, IncomeRepository } from '../domain/income.repository';
import { toDomain } from './income.mapper';

@Injectable()
export class IncomePrismaRepository extends TenantRepository implements IncomeRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll() {
    const rows = await this.prisma.income.findMany({ where: this.scoped(), orderBy: { date: 'desc' } });
    return rows.map(toDomain);
  }

  async create(data: CreateIncomeData) {
    const row = await this.prisma.income.create({
      data: {
        householdId: this.householdId,
        label: data.label,
        memberId: data.memberId ?? undefined,
        value: data.value,
        date: new Date(data.date),
        recurring: data.recurring,
      },
    });
    return toDomain(row);
  }
}
