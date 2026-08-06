import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRepository } from '../domain/transaction.repository';

@Injectable()
export class RemoveTransactionUseCase {
  constructor(private readonly repo: TransactionRepository) {}

  async execute(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundException(`Transação ${id} não encontrada`);
  }
}
