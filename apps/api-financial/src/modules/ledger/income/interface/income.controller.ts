import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListIncomesUseCase } from '../application/list-incomes.usecase';
import { CreateIncomeUseCase } from '../application/create-income.usecase';
import { CreateIncomeDto } from './dto/create-income.dto';

@Controller('incomes')
export class IncomeController {
  constructor(
    private readonly list: ListIncomesUseCase,
    private readonly createUc: CreateIncomeUseCase,
  ) {}

  @Get()
  async findAll() {
    return (await this.list.execute()).map((i) => i.toJSON());
  }

  @Post()
  @Roles('admin', 'editor')
  async create(@Body() dto: CreateIncomeDto) {
    return (await this.createUc.execute(dto)).toJSON();
  }
}
