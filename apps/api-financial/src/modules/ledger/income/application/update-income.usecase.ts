import { Injectable, NotFoundException } from '@nestjs/common';
import { IncomeRepository, UpdateIncomeData } from '../domain/income.repository';

@Injectable()
export class UpdateIncomeUseCase {
  constructor(private readonly repo: IncomeRepository) {}

  async execute(id: string, data: UpdateIncomeData) {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundException(`Receita ${id} não encontrada`);
    return updated;
  }
}
