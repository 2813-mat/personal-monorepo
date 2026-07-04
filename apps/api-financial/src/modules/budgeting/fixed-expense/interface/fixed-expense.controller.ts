import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListFixedExpensesUseCase } from '../application/list-fixed-expenses.usecase';
import { CreateFixedExpenseUseCase } from '../application/create-fixed-expense.usecase';
import { ListFixedExpensesQueryDto } from './dto/list-fixed-expenses-query.dto';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';

@Controller('fixed-expenses')
export class FixedExpenseController {
  constructor(
    private readonly list: ListFixedExpensesUseCase,
    private readonly createUc: CreateFixedExpenseUseCase,
  ) {}

  @Get()
  findAll(@Query() q: ListFixedExpensesQueryDto) {
    const now = new Date();
    const year = q.year ?? now.getFullYear();
    const month = q.month ?? now.getMonth() + 1;
    return this.list.execute(year, month);
  }

  @Post()
  @Roles('admin', 'editor')
  create(@Body() dto: CreateFixedExpenseDto) {
    return this.createUc.execute(dto);
  }
}
