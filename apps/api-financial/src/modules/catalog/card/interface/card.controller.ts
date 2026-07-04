import { Controller, Get, Param } from '@nestjs/common';
import { ListCardsUseCase } from '../application/list-cards.usecase';
import { GetOpenInvoiceUseCase } from '../application/get-open-invoice.usecase';

@Controller('cards')
export class CardController {
  constructor(
    private readonly list: ListCardsUseCase,
    private readonly openInvoice: GetOpenInvoiceUseCase,
  ) {}

  @Get()
  async findAll() {
    return (await this.list.execute()).map((c) => c.toJSON());
  }

  @Get(':id/invoice')
  async invoice(@Param('id') id: string) {
    return this.openInvoice.execute(id);
  }
}
