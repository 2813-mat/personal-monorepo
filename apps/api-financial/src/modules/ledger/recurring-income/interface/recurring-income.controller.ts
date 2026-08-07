import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { requireNonEmptyPatch } from '../../../../infrastructure/http/require-non-empty-patch';
import {
  CreateRecurringIncomeUseCase,
  ListRecurringIncomesUseCase,
  RemoveRecurringIncomeUseCase,
  UpdateRecurringIncomeUseCase,
} from '../application/recurring-income.usecases';
import {
  CreateRecurringIncomeDto,
  UpdateRecurringIncomeDto,
} from './dto/recurring-income.dto';

@Controller('recurring-incomes')
export class RecurringIncomeController {
  constructor(
    private readonly list: ListRecurringIncomesUseCase,
    private readonly createUc: CreateRecurringIncomeUseCase,
    private readonly updateUc: UpdateRecurringIncomeUseCase,
    private readonly removeUc: RemoveRecurringIncomeUseCase,
  ) {}

  @Get()
  async findAll() {
    return (await this.list.execute()).map((r) => r.toJSON());
  }

  @Post()
  @Roles('admin', 'editor')
  async create(@Body() dto: CreateRecurringIncomeDto) {
    return (await this.createUc.execute(dto)).toJSON();
  }

  @Patch(':id')
  @Roles('admin', 'editor')
  async update(@Param('id') id: string, @Body() dto: UpdateRecurringIncomeDto) {
    return (await this.updateUc.execute(id, requireNonEmptyPatch(dto))).toJSON();
  }

  @Delete(':id')
  @Roles('admin', 'editor')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.removeUc.execute(id);
  }
}
