import { Injectable } from '@nestjs/common';
import { MonthlySummaryRepository } from '../domain/monthly-summary.repository';

@Injectable()
export class CloseMonthUseCase {
  constructor(private readonly repo: MonthlySummaryRepository) {}
  execute(year: number, month: number) {
    return this.repo.closeMonth(year, month);
  }
}
