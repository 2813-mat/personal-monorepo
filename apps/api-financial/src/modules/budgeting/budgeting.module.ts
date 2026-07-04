import { Module } from '@nestjs/common';
import { FixedExpenseController } from './fixed-expense/interface/fixed-expense.controller';
import { ListFixedExpensesUseCase } from './fixed-expense/application/list-fixed-expenses.usecase';
import { CreateFixedExpenseUseCase } from './fixed-expense/application/create-fixed-expense.usecase';
import { FixedExpenseRepository } from './fixed-expense/domain/fixed-expense.repository';
import { FixedExpensePrismaRepository } from './fixed-expense/infrastructure/fixed-expense.prisma.repository';

@Module({
  controllers: [FixedExpenseController],
  providers: [
    ListFixedExpensesUseCase,
    CreateFixedExpenseUseCase,
    { provide: FixedExpenseRepository, useClass: FixedExpensePrismaRepository },
  ],
})
export class BudgetingModule {}
