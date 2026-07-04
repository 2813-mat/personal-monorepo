import { Injectable } from '@nestjs/common';
import { AddContributionData, GoalRepository } from '../domain/goal.repository';

@Injectable()
export class AddContributionUseCase {
  constructor(private readonly repo: GoalRepository) {}
  execute(goalId: string, data: AddContributionData) {
    return this.repo.addContribution(goalId, data);
  }
}
