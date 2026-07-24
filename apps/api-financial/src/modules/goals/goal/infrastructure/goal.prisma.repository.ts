import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { AddContributionData, GoalRepository, GoalView } from '../domain/goal.repository';
import { toView } from './goal.mapper';

@Injectable()
export class GoalPrismaRepository extends TenantRepository implements GoalRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll(): Promise<GoalView[]> {
    const goals = await this.prisma.goal.findMany({
      where: this.scoped(),
      include: { contributions: true },
      orderBy: { label: 'asc' },
    });
    return goals.map((g) => toView(g));
  }

  async addContribution(slug: string, data: AddContributionData): Promise<void> {
    const goal = await this.prisma.goal.findFirstOrThrow({ where: this.scoped({ slug }) });
    await this.prisma.goalContribution.create({
      data: {
        householdId: this.householdId,
        goalId: goal.id,
        amount: data.amount,
        date: new Date(data.date),
      },
    });
  }
}
