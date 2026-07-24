import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListCardInvoicesUseCase } from '../application/list-card-invoices.usecase';
import { ListAllInvoicesUseCase } from '../application/list-all-invoices.usecase';
import { CloseInvoiceUseCase } from '../application/close-invoice.usecase';
import { CloseInvoiceDto } from './dto/close-invoice.dto';

@Controller('cards')
export class InvoiceHistoryController {
  constructor(
    private readonly list: ListCardInvoicesUseCase,
    private readonly listAll: ListAllInvoicesUseCase,
    private readonly closeUc: CloseInvoiceUseCase,
  ) {}

  // Rota estática declarada ANTES da paramétrica: hoje não há colisão (contagens
  // de segmento diferentes), mas um `:id` futuro capturaria 'invoices'.
  @Get('invoices')
  findAll() {
    return this.listAll.execute();
  }

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
