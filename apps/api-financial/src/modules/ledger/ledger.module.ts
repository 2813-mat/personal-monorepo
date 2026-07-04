import { Module } from '@nestjs/common';
import { TransactionController } from './transaction/interface/transaction.controller';
import { ListTransactionsUseCase } from './transaction/application/list-transactions.usecase';
import { CreateTransactionUseCase } from './transaction/application/create-transaction.usecase';
import { RemoveTransactionUseCase } from './transaction/application/remove-transaction.usecase';
import { TransactionRepository } from './transaction/domain/transaction.repository';
import { TransactionPrismaRepository } from './transaction/infrastructure/transaction.prisma.repository';
import { IncomeController } from './income/interface/income.controller';
import { ListIncomesUseCase } from './income/application/list-incomes.usecase';
import { CreateIncomeUseCase } from './income/application/create-income.usecase';
import { IncomeRepository } from './income/domain/income.repository';
import { IncomePrismaRepository } from './income/infrastructure/income.prisma.repository';

@Module({
  controllers: [TransactionController, IncomeController],
  providers: [
    ListTransactionsUseCase,
    CreateTransactionUseCase,
    RemoveTransactionUseCase,
    { provide: TransactionRepository, useClass: TransactionPrismaRepository },
    ListIncomesUseCase,
    CreateIncomeUseCase,
    { provide: IncomeRepository, useClass: IncomePrismaRepository },
  ],
})
export class LedgerModule {}
