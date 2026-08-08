import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { requireNonEmptyPatch } from '../../../../infrastructure/http/require-non-empty-patch';
import { ListFixedExpensesUseCase } from '../application/list-fixed-expenses.usecase';
import { CreateFixedExpenseUseCase } from '../application/create-fixed-expense.usecase';
import { UpdateFixedExpenseUseCase } from '../application/update-fixed-expense.usecase';
import { RemoveFixedExpenseUseCase } from '../application/remove-fixed-expense.usecase';
import { PayFixedExpenseUseCase } from '../application/pay-fixed-expense.usecase';
import { UnpayFixedExpenseUseCase } from '../application/unpay-fixed-expense.usecase';
import { ListFixedExpensesQueryDto } from './dto/list-fixed-expenses-query.dto';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto';
import { PayFixedExpenseDto } from './dto/pay-fixed-expense.dto';
import { UnpayFixedExpenseQueryDto } from './dto/unpay-fixed-expense-query.dto';

@Controller('fixed-expenses')
export class FixedExpenseController {
  constructor(
    private readonly list: ListFixedExpensesUseCase,
    private readonly createUc: CreateFixedExpenseUseCase,
    private readonly updateUc: UpdateFixedExpenseUseCase,
    private readonly removeUc: RemoveFixedExpenseUseCase,
    private readonly payUc: PayFixedExpenseUseCase,
    private readonly unpayUc: UnpayFixedExpenseUseCase,
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

  @Patch(':id')
  @Roles('admin', 'editor')
  update(@Param('id') id: string, @Body() dto: UpdateFixedExpenseDto) {
    return this.updateUc.execute(id, requireNonEmptyPatch(dto));
  }

  /**
   * Lança o pagamento do mês. A competência vem da data do corpo, não da query:
   * pagar o aluguel de julho no dia 2 de agosto é a data que decide.
   */
  @Post(':id/pay')
  @Roles('admin', 'editor')
  pay(@Param('id') id: string, @Body() dto: PayFixedExpenseDto) {
    return this.payUc.execute(id, dto);
  }

  @Delete(':id/pay')
  @Roles('admin', 'editor')
  unpay(@Param('id') id: string, @Query() q: UnpayFixedExpenseQueryDto) {
    return this.unpayUc.execute(id, q.year, q.month);
  }

  @Delete(':id')
  @Roles('admin', 'editor')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.removeUc.execute(id);
  }
}
