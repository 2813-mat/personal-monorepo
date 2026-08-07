import { Module } from '@nestjs/common';
import { TransactionController } from './transaction/interface/transaction.controller';
import { ListTransactionsUseCase } from './transaction/application/list-transactions.usecase';
import { CreateTransactionUseCase } from './transaction/application/create-transaction.usecase';
import { RemoveTransactionUseCase } from './transaction/application/remove-transaction.usecase';
import { UpdateTransactionUseCase } from './transaction/application/update-transaction.usecase';
import { TransactionRepository } from './transaction/domain/transaction.repository';
import { TransactionPrismaRepository } from './transaction/infrastructure/transaction.prisma.repository';
import { IncomeController } from './income/interface/income.controller';
import { ListIncomesUseCase } from './income/application/list-incomes.usecase';
import { CreateIncomeUseCase } from './income/application/create-income.usecase';
import { UpdateIncomeUseCase } from './income/application/update-income.usecase';
import { RemoveIncomeUseCase } from './income/application/remove-income.usecase';
import { IncomeRepository } from './income/domain/income.repository';
import { IncomePrismaRepository } from './income/infrastructure/income.prisma.repository';
import { RecurringIncomeController } from './recurring-income/interface/recurring-income.controller';
import {
  CreateRecurringIncomeUseCase,
  ListRecurringIncomesUseCase,
  RemoveRecurringIncomeUseCase,
  UpdateRecurringIncomeUseCase,
} from './recurring-income/application/recurring-income.usecases';
import { RecurringIncomeRepository } from './recurring-income/domain/recurring-income.repository';
import { RecurringIncomePrismaRepository } from './recurring-income/infrastructure/recurring-income.prisma.repository';

@Module({
  controllers: [TransactionController, IncomeController, RecurringIncomeController],
  providers: [
    ListTransactionsUseCase,
    CreateTransactionUseCase,
    RemoveTransactionUseCase,
    UpdateTransactionUseCase,
    { provide: TransactionRepository, useClass: TransactionPrismaRepository },
    ListIncomesUseCase,
    CreateIncomeUseCase,
    UpdateIncomeUseCase,
    RemoveIncomeUseCase,
    { provide: IncomeRepository, useClass: IncomePrismaRepository },
    ListRecurringIncomesUseCase,
    CreateRecurringIncomeUseCase,
    UpdateRecurringIncomeUseCase,
    RemoveRecurringIncomeUseCase,
    { provide: RecurringIncomeRepository, useClass: RecurringIncomePrismaRepository },
  ],
})
export class LedgerModule {}
