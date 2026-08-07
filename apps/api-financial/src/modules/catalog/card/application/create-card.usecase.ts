import { Injectable } from '@nestjs/common';
import { CardRepository, CreateCardData } from '../domain/card.repository';

@Injectable()
export class CreateCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  execute(data: CreateCardData) {
    return this.repo.create(data);
  }
}
