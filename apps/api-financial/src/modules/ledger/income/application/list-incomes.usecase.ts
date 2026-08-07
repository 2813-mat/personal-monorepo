import { Injectable } from '@nestjs/common';
import { IncomeFilter, IncomeRepository } from '../domain/income.repository';

@Injectable()
export class ListIncomesUseCase {
  constructor(private readonly repo: IncomeRepository) {}
  execute(filter: IncomeFilter = {}) {
    return this.repo.findAll(filter);
  }
}
