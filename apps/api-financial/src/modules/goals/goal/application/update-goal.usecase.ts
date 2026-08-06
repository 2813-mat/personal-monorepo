import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalRepository, UpdateGoalData } from '../domain/goal.repository';

@Injectable()
export class UpdateGoalUseCase {
  constructor(private readonly repo: GoalRepository) {}

  async execute(slug: string, data: UpdateGoalData) {
    const updated = await this.repo.update(slug, data);
    if (!updated) throw new NotFoundException(`Meta ${slug} não encontrada`);
    return updated;
  }
}
