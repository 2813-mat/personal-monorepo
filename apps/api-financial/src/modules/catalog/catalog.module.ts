import { Module } from '@nestjs/common';
import { CategoryController } from './category/interface/category.controller';
import { ListCategoriesUseCase } from './category/application/list-categories.usecase';
import { CreateCategoryUseCase } from './category/application/create-category.usecase';
import { CategoryRepository } from './category/domain/category.repository';
import { CategoryPrismaRepository } from './category/infrastructure/category.prisma.repository';

@Module({
  controllers: [CategoryController],
  providers: [
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    { provide: CategoryRepository, useClass: CategoryPrismaRepository },
  ],
})
export class CatalogModule {}
