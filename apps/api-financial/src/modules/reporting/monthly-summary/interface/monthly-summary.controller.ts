import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListMonthlySummariesUseCase } from '../application/list-monthly-summaries.usecase';
import { CloseMonthUseCase } from '../application/close-month.usecase';
import { CloseMonthDto } from './dto/close-month.dto';

@Controller('reports/monthly')
export class MonthlySummaryController {
  constructor(
    private readonly list: ListMonthlySummariesUseCase,
    private readonly closeUc: CloseMonthUseCase,
  ) {}

  @Get()
  findAll() {
    return this.list.execute();
  }

  @Post('close')
  @Roles('admin')
  close(@Body() dto: CloseMonthDto) {
    return this.closeUc.execute(dto.year, dto.month);
  }
}
