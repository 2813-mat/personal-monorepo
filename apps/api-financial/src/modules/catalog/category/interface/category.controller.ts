import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListCategoriesUseCase } from '../application/list-categories.usecase';
import { CreateCategoryUseCase } from '../application/create-category.usecase';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly list: ListCategoriesUseCase,
    private readonly createUc: CreateCategoryUseCase,
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
}
