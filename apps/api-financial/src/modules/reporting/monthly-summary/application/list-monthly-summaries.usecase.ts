import { Injectable } from '@nestjs/common';
import { MonthlySummaryRepository } from '../domain/monthly-summary.repository';

@Injectable()
export class ListMonthlySummariesUseCase {
  constructor(private readonly repo: MonthlySummaryRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
