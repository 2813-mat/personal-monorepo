import { Injectable } from '@nestjs/common';
import { CreateGoalData, GoalRepository } from '../domain/goal.repository';

@Injectable()
export class CreateGoalUseCase {
  constructor(private readonly repo: GoalRepository) {}
  execute(data: CreateGoalData) {
    return this.repo.create(data);
  }
}
