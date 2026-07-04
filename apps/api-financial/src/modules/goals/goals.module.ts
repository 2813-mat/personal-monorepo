import { Module } from '@nestjs/common';
import { GoalController } from './goal/interface/goal.controller';
import { ListGoalsUseCase } from './goal/application/list-goals.usecase';
import { AddContributionUseCase } from './goal/application/add-contribution.usecase';
import { GoalRepository } from './goal/domain/goal.repository';
import { GoalPrismaRepository } from './goal/infrastructure/goal.prisma.repository';

@Module({
  controllers: [GoalController],
  providers: [
    ListGoalsUseCase,
    AddContributionUseCase,
    { provide: GoalRepository, useClass: GoalPrismaRepository },
  ],
})
export class GoalsModule {}
