import { Injectable } from '@nestjs/common';
import { TransactionRepository, TxFilter } from '../domain/transaction.repository';

@Injectable()
export class ListTransactionsUseCase {
  constructor(private readonly repo: TransactionRepository) {}
  execute(filter: TxFilter) {
    return this.repo.findAll(filter);
  }
}
