import { Injectable } from '@nestjs/common';
import { CreateIncomeData, IncomeRepository } from '../domain/income.repository';

@Injectable()
export class CreateIncomeUseCase {
  constructor(private readonly repo: IncomeRepository) {}
  execute(data: CreateIncomeData) {
    return this.repo.create(data);
  }
}
