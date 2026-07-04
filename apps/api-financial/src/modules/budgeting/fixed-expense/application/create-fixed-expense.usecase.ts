import { Injectable } from '@nestjs/common';
import { CreateFixedExpenseData, FixedExpenseRepository } from '../domain/fixed-expense.repository';

@Injectable()
export class CreateFixedExpenseUseCase {
  constructor(private readonly repo: FixedExpenseRepository) {}
  execute(data: CreateFixedExpenseData) {
    return this.repo.create(data);
  }
}
