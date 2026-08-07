import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository } from '../domain/category.repository';

@Injectable()
export class RemoveCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(slug: string): Promise<void> {
    const usage = await this.repo.countUsage(slug);
    if (!usage) throw new NotFoundException(`Categoria ${slug} não encontrada`);
    if (usage.transactions > 0 || usage.fixedExpenses > 0) {
      // Category.id é FK obrigatória em Transaction e FixedExpense: excluir
      // exigiria reescrever lançamentos históricos. A UI explica com a contagem.
      throw new ConflictException({
        message: 'Categoria em uso',
        transactions: usage.transactions,
        fixedExpenses: usage.fixedExpenses,
      });
    }
    await this.repo.remove(slug);
  }
}
