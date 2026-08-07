import { Injectable, NotFoundException } from '@nestjs/common';
import { CardRepository } from '../domain/card.repository';

@Injectable()
export class ArchiveCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(id: string, archived: boolean) {
    const card = await this.repo.setArchived(id, archived);
    if (!card) throw new NotFoundException(`Cartão ${id} não encontrado`);
    return card;
  }
}
