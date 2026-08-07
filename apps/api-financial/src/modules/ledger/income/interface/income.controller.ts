import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { requireNonEmptyPatch } from '../../../../infrastructure/http/require-non-empty-patch';
import { ListIncomesUseCase } from '../application/list-incomes.usecase';
import { CreateIncomeUseCase } from '../application/create-income.usecase';
import { UpdateIncomeUseCase } from '../application/update-income.usecase';
import { RemoveIncomeUseCase } from '../application/remove-income.usecase';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomeQueryDto } from './dto/income-query.dto';

@Controller('incomes')
export class IncomeController {
  constructor(
    private readonly list: ListIncomesUseCase,
    private readonly createUc: CreateIncomeUseCase,
    private readonly updateUc: UpdateIncomeUseCase,
    private readonly removeUc: RemoveIncomeUseCase,
  ) {}

  /**
   * Sem year/month devolve o histórico inteiro, que é do que os relatórios
   * ainda dependem. A UI do mês manda os dois.
   */
  @Get()
  async findAll(@Query() q: IncomeQueryDto) {
    return (await this.list.execute({ year: q.year, month: q.month })).map((i) => i.toJSON());
  }

  @Post()
  @Roles('admin', 'editor')
  async create(@Body() dto: CreateIncomeDto) {
    return (await this.createUc.execute(dto)).toJSON();
  }

  @Patch(':id')
  @Roles('admin', 'editor')
  async update(@Param('id') id: string, @Body() dto: UpdateIncomeDto) {
    return (await this.updateUc.execute(id, requireNonEmptyPatch(dto))).toJSON();
  }

  @Delete(':id')
  @Roles('admin', 'editor')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.removeUc.execute(id);
  }
}
