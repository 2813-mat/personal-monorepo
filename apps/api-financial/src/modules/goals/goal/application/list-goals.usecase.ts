import { Injectable } from '@nestjs/common';
import { GoalRepository } from '../domain/goal.repository';

@Injectable()
export class ListGoalsUseCase {
  constructor(private readonly repo: GoalRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
