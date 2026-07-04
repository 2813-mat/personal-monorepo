import { Injectable } from '@nestjs/common';
import { CreateTransactionData, TransactionRepository } from '../domain/transaction.repository';

@Injectable()
export class CreateTransactionUseCase {
  constructor(private readonly repo: TransactionRepository) {}
  execute(data: CreateTransactionData) {
    return this.repo.create(data);
  }
}
