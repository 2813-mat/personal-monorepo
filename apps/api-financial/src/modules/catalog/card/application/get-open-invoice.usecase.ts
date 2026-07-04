import { Injectable } from '@nestjs/common';
import { CardRepository } from '../domain/card.repository';

@Injectable()
export class GetOpenInvoiceUseCase {
  constructor(private readonly repo: CardRepository) {}
  execute(cardId: string) {
    return this.repo.openInvoice(cardId);
  }
}
