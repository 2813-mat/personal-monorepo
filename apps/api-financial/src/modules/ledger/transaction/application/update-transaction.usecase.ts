import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRepository, UpdateTransactionData } from '../domain/transaction.repository';

@Injectable()
export class UpdateTransactionUseCase {
  constructor(private readonly repo: TransactionRepository) {}

  async execute(id: string, data: UpdateTransactionData) {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundException(`Transação ${id} não encontrada`);
    return updated;
  }
}
