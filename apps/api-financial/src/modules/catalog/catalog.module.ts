import { Module } from '@nestjs/common';
import { CategoryController } from './category/interface/category.controller';
import { ListCategoriesUseCase } from './category/application/list-categories.usecase';
import { CreateCategoryUseCase } from './category/application/create-category.usecase';
import { CategoryRepository } from './category/domain/category.repository';
import { CategoryPrismaRepository } from './category/infrastructure/category.prisma.repository';
import { CardController } from './card/interface/card.controller';
import { ListCardsUseCase } from './card/application/list-cards.usecase';
import { GetOpenInvoiceUseCase } from './card/application/get-open-invoice.usecase';
import { CardRepository } from './card/domain/card.repository';
import { CardPrismaRepository } from './card/infrastructure/card.prisma.repository';

@Module({
  controllers: [CategoryController, CardController],
  providers: [
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    { provide: CategoryRepository, useClass: CategoryPrismaRepository },
    ListCardsUseCase,
    GetOpenInvoiceUseCase,
    { provide: CardRepository, useClass: CardPrismaRepository },
  ],
})
export class CatalogModule {}
