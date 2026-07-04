import { Module } from '@nestjs/common';
import { TransactionController } from './transaction/interface/transaction.controller';
import { ListTransactionsUseCase } from './transaction/application/list-transactions.usecase';
import { CreateTransactionUseCase } from './transaction/application/create-transaction.usecase';
import { RemoveTransactionUseCase } from './transaction/application/remove-transaction.usecase';
import { TransactionRepository } from './transaction/domain/transaction.repository';
import { TransactionPrismaRepository } from './transaction/infrastructure/transaction.prisma.repository';

@Module({
  controllers: [TransactionController],
  providers: [
    ListTransactionsUseCase,
    CreateTransactionUseCase,
    RemoveTransactionUseCase,
    { provide: TransactionRepository, useClass: TransactionPrismaRepository },
  ],
})
export class LedgerModule {}
