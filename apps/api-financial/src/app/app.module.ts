import { Module } from '@nestjs/common';
import { AppConfigModule } from '../infrastructure/config/config.module';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { AuthModule } from '../infrastructure/auth/auth.module';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { LedgerModule } from '../modules/ledger/ledger.module';
import { BudgetingModule } from '../modules/budgeting/budgeting.module';
// import { GoalsModule } from '../modules/goals/goals.module';
// import { ReportingModule } from '../modules/reporting/reporting.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    CatalogModule,
    LedgerModule,
    BudgetingModule,
    // GoalsModule,
    // ReportingModule,
  ],
})
export class AppModule {}
