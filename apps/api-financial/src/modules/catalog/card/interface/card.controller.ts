import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListCardsUseCase } from '../application/list-cards.usecase';
import { GetOpenInvoiceUseCase } from '../application/get-open-invoice.usecase';
import { CreateCardUseCase } from '../application/create-card.usecase';
import { CreateCardDto } from './dto/create-card.dto';
import { toCardView } from './card.view';

@Controller('cards')
export class CardController {
  constructor(
    private readonly list: ListCardsUseCase,
    private readonly openInvoice: GetOpenInvoiceUseCase,
    private readonly createUc: CreateCardUseCase,
  ) {}

  @Get()
  async findAll() {
    return (await this.list.execute()).map((c) => toCardView(c.toJSON()));
  }

  @Get(':id/invoice')
  async invoice(@Param('id') id: string) {
    return this.openInvoice.execute(id);
  }

  @Post()
  @Roles('admin', 'editor')
  async create(@Body() dto: CreateCardDto) {
    return toCardView((await this.createUc.execute(dto)).toJSON());
  }
}
