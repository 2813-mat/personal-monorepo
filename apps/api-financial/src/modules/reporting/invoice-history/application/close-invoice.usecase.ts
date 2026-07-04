import { Injectable } from '@nestjs/common';
import { InvoiceHistoryRepository } from '../domain/invoice-history.repository';

@Injectable()
export class CloseInvoiceUseCase {
  constructor(private readonly repo: InvoiceHistoryRepository) {}
  execute(cardId: string, year: number, month: number) {
    return this.repo.closeInvoice(cardId, year, month);
  }
}
