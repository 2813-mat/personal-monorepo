import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListCardInvoicesUseCase } from '../application/list-card-invoices.usecase';
import { CloseInvoiceUseCase } from '../application/close-invoice.usecase';
import { CloseInvoiceDto } from './dto/close-invoice.dto';

@Controller('cards')
export class InvoiceHistoryController {
  constructor(
    private readonly list: ListCardInvoicesUseCase,
    private readonly closeUc: CloseInvoiceUseCase,
  ) {}

  @Get(':id/invoices')
  findByCard(@Param('id') id: string) {
    return this.list.execute(id);
  }

  @Post(':id/invoices/close')
  @Roles('admin')
  close(@Param('id') id: string, @Body() dto: CloseInvoiceDto) {
    return this.closeUc.execute(id, dto.year, dto.month);
  }
}
