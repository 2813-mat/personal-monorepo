import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateRecurringIncomeData,
  RecurringIncomeRepository,
  UpdateRecurringIncomeData,
} from '../domain/recurring-income.repository';

@Injectable()
export class ListRecurringIncomesUseCase {
  constructor(private readonly repo: RecurringIncomeRepository) {}
  execute() {
    return this.repo.findAll();
  }
}

@Injectable()
export class CreateRecurringIncomeUseCase {
  constructor(private readonly repo: RecurringIncomeRepository) {}
  execute(data: CreateRecurringIncomeData) {
    return this.repo.create(data);
  }
}

@Injectable()
export class UpdateRecurringIncomeUseCase {
  constructor(private readonly repo: RecurringIncomeRepository) {}
  async execute(id: string, data: UpdateRecurringIncomeData) {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundException(`Receita recorrente ${id} não encontrada`);
    return updated;
  }
}

@Injectable()
export class RemoveRecurringIncomeUseCase {
  constructor(private readonly repo: RecurringIncomeRepository) {}
  async execute(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundException(`Receita recorrente ${id} não encontrada`);
  }
}
