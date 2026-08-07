import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FixedExpenseRepository,
  UpdateFixedExpenseData,
} from '../domain/fixed-expense.repository';

@Injectable()
export class UpdateFixedExpenseUseCase {
  constructor(private readonly repo: FixedExpenseRepository) {}

  async execute(id: string, data: UpdateFixedExpenseData) {
    // paidThisMonth é relativo a um mês; a view devolvida usa o mês corrente.
    const now = new Date();
    const updated = await this.repo.update(id, data, now.getFullYear(), now.getMonth() + 1);
    if (!updated) throw new NotFoundException(`Gasto fixo ${id} não encontrado`);
    return updated;
  }
}
