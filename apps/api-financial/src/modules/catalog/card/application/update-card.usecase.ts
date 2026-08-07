import { Injectable, NotFoundException } from '@nestjs/common';
import { CardRepository, UpdateCardData } from '../domain/card.repository';

@Injectable()
export class UpdateCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(id: string, data: UpdateCardData) {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundException(`Cartão ${id} não encontrado`);
    return updated;
  }
}
