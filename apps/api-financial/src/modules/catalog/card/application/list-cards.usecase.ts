import { Injectable } from '@nestjs/common';
import { CardRepository } from '../domain/card.repository';

@Injectable()
export class ListCardsUseCase {
  constructor(private readonly repo: CardRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
