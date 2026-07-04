import { Module } from '@nestjs/common';
import { MonthlySummaryController } from './monthly-summary/interface/monthly-summary.controller';
import { ListMonthlySummariesUseCase } from './monthly-summary/application/list-monthly-summaries.usecase';
import { CloseMonthUseCase } from './monthly-summary/application/close-month.usecase';
import { MonthlySummaryRepository } from './monthly-summary/domain/monthly-summary.repository';
import { MonthlySummaryPrismaRepository } from './monthly-summary/infrastructure/monthly-summary.prisma.repository';

@Module({
  controllers: [MonthlySummaryController],
  providers: [
    ListMonthlySummariesUseCase,
    CloseMonthUseCase,
    { provide: MonthlySummaryRepository, useClass: MonthlySummaryPrismaRepository },
  ],
})
export class ReportingModule {}
