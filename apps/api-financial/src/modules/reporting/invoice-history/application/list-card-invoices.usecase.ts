import { Injectable } from '@nestjs/common';
import { InvoiceHistoryRepository } from '../domain/invoice-history.repository';

@Injectable()
export class ListCardInvoicesUseCase {
  constructor(private readonly repo: InvoiceHistoryRepository) {}
  execute(cardId: string) {
    return this.repo.findByCard(cardId);
  }
}
