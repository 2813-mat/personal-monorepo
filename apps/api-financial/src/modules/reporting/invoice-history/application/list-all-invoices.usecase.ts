import { Injectable } from '@nestjs/common';
import { InvoiceHistoryRepository } from '../domain/invoice-history.repository';

@Injectable()
export class ListAllInvoicesUseCase {
  constructor(private readonly repo: InvoiceHistoryRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
