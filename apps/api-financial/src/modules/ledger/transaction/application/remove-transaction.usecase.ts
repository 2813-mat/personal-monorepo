import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../domain/transaction.repository';

@Injectable()
export class RemoveTransactionUseCase {
  constructor(private readonly repo: TransactionRepository) {}
  execute(id: string) {
    return this.repo.remove(id);
  }
}
