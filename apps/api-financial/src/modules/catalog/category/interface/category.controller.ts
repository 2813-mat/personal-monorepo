import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { requireNonEmptyPatch } from '../../../../infrastructure/http/require-non-empty-patch';
import { ListCategoriesUseCase } from '../application/list-categories.usecase';
import { CreateCategoryUseCase } from '../application/create-category.usecase';
import { UpdateCategoryUseCase } from '../application/update-category.usecase';
import { RemoveCategoryUseCase } from '../application/remove-category.usecase';
import { ReorderCategoriesUseCase } from '../application/reorder-categories.usecase';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly list: ListCategoriesUseCase,
    private readonly createUc: CreateCategoryUseCase,
    private readonly updateUc: UpdateCategoryUseCase,
    private readonly removeUc: RemoveCategoryUseCase,
    private readonly reorderUc: ReorderCategoriesUseCase,
  ) {}

  @Get()
  async findAll() {
    return (await this.list.execute()).map((c) => c.toJSON());
  }

  @Post()
  @Roles('admin', 'editor')
  async create(@Body() dto: CreateCategoryDto) {
    return (await this.createUc.execute(dto)).toJSON();
  }

  // Precisa vir ANTES de @Patch(':slug'), senão o Nest casa 'order' como slug.
  @Patch('order')
  @Roles('admin', 'editor')
  async reorder(@Body() dto: ReorderCategoriesDto) {
    return (await this.reorderUc.execute(dto.slugs)).map((c) => c.toJSON());
  }

  @Patch(':slug')
  @Roles('admin', 'editor')
  async update(@Param('slug') slug: string, @Body() dto: UpdateCategoryDto) {
    return (await this.updateUc.execute(slug, requireNonEmptyPatch(dto))).toJSON();
  }

  @Delete(':slug')
  @Roles('admin', 'editor')
  @HttpCode(204)
  async remove(@Param('slug') slug: string) {
    await this.removeUc.execute(slug);
  }
}
