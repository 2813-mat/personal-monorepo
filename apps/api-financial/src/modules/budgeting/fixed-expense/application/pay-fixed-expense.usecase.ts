import { Injectable, NotFoundException } from '@nestjs/common';
import { FixedExpenseRepository, PayFixedExpenseData } from '../domain/fixed-expense.repository';

@Injectable()
export class PayFixedExpenseUseCase {
  constructor(private readonly repo: FixedExpenseRepository) {}

  async execute(id: string, data: PayFixedExpenseData) {
    const paid = await this.repo.pay(id, data);
    if (!paid) throw new NotFoundException(`Gasto fixo ${id} não encontrado`);
    return paid;
  }
}
