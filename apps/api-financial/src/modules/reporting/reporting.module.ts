import { Module } from '@nestjs/common';
import { MonthlySummaryController } from './monthly-summary/interface/monthly-summary.controller';
import { ListMonthlySummariesUseCase } from './monthly-summary/application/list-monthly-summaries.usecase';
import { CloseMonthUseCase } from './monthly-summary/application/close-month.usecase';
import { MonthlySummaryRepository } from './monthly-summary/domain/monthly-summary.repository';
import { MonthlySummaryPrismaRepository } from './monthly-summary/infrastructure/monthly-summary.prisma.repository';
import { InvoiceHistoryController } from './invoice-history/interface/invoice-history.controller';
import { ListCardInvoicesUseCase } from './invoice-history/application/list-card-invoices.usecase';
import { ListAllInvoicesUseCase } from './invoice-history/application/list-all-invoices.usecase';
import { CloseInvoiceUseCase } from './invoice-history/application/close-invoice.usecase';
import { InvoiceHistoryRepository } from './invoice-history/domain/invoice-history.repository';
import { InvoiceHistoryPrismaRepository } from './invoice-history/infrastructure/invoice-history.prisma.repository';

@Module({
  controllers: [MonthlySummaryController, InvoiceHistoryController],
  providers: [
    ListMonthlySummariesUseCase,
    CloseMonthUseCase,
    { provide: MonthlySummaryRepository, useClass: MonthlySummaryPrismaRepository },
    ListCardInvoicesUseCase,
    ListAllInvoicesUseCase,
    CloseInvoiceUseCase,
    { provide: InvoiceHistoryRepository, useClass: InvoiceHistoryPrismaRepository },
  ],
})
export class ReportingModule {}
