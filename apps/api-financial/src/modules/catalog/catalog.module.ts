import { Module } from '@nestjs/common';
import { CategoryController } from './category/interface/category.controller';
import { ListCategoriesUseCase } from './category/application/list-categories.usecase';
import { CreateCategoryUseCase } from './category/application/create-category.usecase';
import { UpdateCategoryUseCase } from './category/application/update-category.usecase';
import { RemoveCategoryUseCase } from './category/application/remove-category.usecase';
import { ReorderCategoriesUseCase } from './category/application/reorder-categories.usecase';
import { CategoryRepository } from './category/domain/category.repository';
import { CategoryPrismaRepository } from './category/infrastructure/category.prisma.repository';
import { CardController } from './card/interface/card.controller';
import { ListCardsUseCase } from './card/application/list-cards.usecase';
import { GetOpenInvoiceUseCase } from './card/application/get-open-invoice.usecase';
import { CreateCardUseCase } from './card/application/create-card.usecase';
import { UpdateCardUseCase } from './card/application/update-card.usecase';
import { RemoveCardUseCase } from './card/application/remove-card.usecase';
import { ArchiveCardUseCase } from './card/application/archive-card.usecase';
import { CardRepository } from './card/domain/card.repository';
import { CardPrismaRepository } from './card/infrastructure/card.prisma.repository';

@Module({
  controllers: [CategoryController, CardController],
  providers: [
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    RemoveCategoryUseCase,
    ReorderCategoriesUseCase,
    { provide: CategoryRepository, useClass: CategoryPrismaRepository },
    ListCardsUseCase,
    GetOpenInvoiceUseCase,
    CreateCardUseCase,
    UpdateCardUseCase,
    RemoveCardUseCase,
    ArchiveCardUseCase,
    { provide: CardRepository, useClass: CardPrismaRepository },
  ],
})
export class CatalogModule {}
