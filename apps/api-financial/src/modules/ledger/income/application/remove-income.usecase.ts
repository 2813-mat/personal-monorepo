import { Injectable, NotFoundException } from '@nestjs/common';
import { IncomeRepository } from '../domain/income.repository';

@Injectable()
export class RemoveIncomeUseCase {
  constructor(private readonly repo: IncomeRepository) {}

  async execute(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundException(`Receita ${id} não encontrada`);
  }
}
