import { Injectable, NotFoundException } from '@nestjs/common';
import { FixedExpenseRepository } from '../domain/fixed-expense.repository';

@Injectable()
export class RemoveFixedExpenseUseCase {
  constructor(private readonly repo: FixedExpenseRepository) {}

  async execute(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundException(`Gasto fixo ${id} não encontrado`);
  }
}
