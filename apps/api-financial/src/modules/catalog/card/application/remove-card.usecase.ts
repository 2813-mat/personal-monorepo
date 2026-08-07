import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CardRepository } from '../domain/card.repository';

@Injectable()
export class RemoveCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(id: string): Promise<void> {
    const usage = await this.repo.countUsage(id);
    if (!usage) throw new NotFoundException(`Cartão ${id} não encontrado`);
    if (usage.transactions > 0 || usage.invoices > 0) {
      // InvoiceHistory.cardId é FK obrigatória e Transaction.cardId, embora
      // anulável, não pode ser zerado: um gasto no crédito passaria a parecer
      // Pix. A UI usa estas contagens para oferecer arquivar.
      throw new ConflictException({
        message: 'Cartão em uso',
        transactions: usage.transactions,
        invoices: usage.invoices,
      });
    }
    await this.repo.remove(id);
  }
}
