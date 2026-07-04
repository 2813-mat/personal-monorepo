import { Injectable } from '@nestjs/common';
import { IncomeRepository } from '../domain/income.repository';

@Injectable()
export class ListIncomesUseCase {
  constructor(private readonly repo: IncomeRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
