import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListTransactionsUseCase } from '../application/list-transactions.usecase';
import { CreateTransactionUseCase } from '../application/create-transaction.usecase';
import { RemoveTransactionUseCase } from '../application/remove-transaction.usecase';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly list: ListTransactionsUseCase,
    private readonly createUc: CreateTransactionUseCase,
    private readonly removeUc: RemoveTransactionUseCase,
  ) {}

  @Get()
  findAll(@Query() q: TransactionQueryDto) {
    return this.list.execute({
      year: q.year,
      month: q.month,
      holder: q.holder,
      categorySlug: q.cat,
      method: q.method,
    });
  }

  @Post()
  @Roles('admin', 'editor')
  create(@Body() dto: CreateTransactionDto) {
    return this.createUc.execute(dto);
  }

  @Delete(':id')
  @Roles('admin', 'editor')
  async remove(@Param('id') id: string) {
    await this.removeUc.execute(id);
  }
}
