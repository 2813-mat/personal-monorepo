import { Injectable, NotFoundException } from '@nestjs/common';
import { FixedExpenseRepository } from '../domain/fixed-expense.repository';

@Injectable()
export class UnpayFixedExpenseUseCase {
  constructor(private readonly repo: FixedExpenseRepository) {}

  async execute(id: string, year: number, month: number) {
    const fixo = await this.repo.unpay(id, year, month);
    if (!fixo) throw new NotFoundException(`Gasto fixo ${id} não encontrado`);
    return fixo;
  }
}
