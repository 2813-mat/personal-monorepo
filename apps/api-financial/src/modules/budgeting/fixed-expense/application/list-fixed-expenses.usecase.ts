import { Injectable } from '@nestjs/common';
import { FixedExpenseRepository } from '../domain/fixed-expense.repository';

@Injectable()
export class ListFixedExpensesUseCase {
  constructor(private readonly repo: FixedExpenseRepository) {}
  execute(year: number, month: number) {
    return this.repo.findAllWithStatus(year, month);
  }
}
