import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { requireNonEmptyPatch } from '../../../../infrastructure/http/require-non-empty-patch';
import { ListGoalsUseCase } from '../application/list-goals.usecase';
import { AddContributionUseCase } from '../application/add-contribution.usecase';
import { CreateGoalUseCase } from '../application/create-goal.usecase';
import { UpdateGoalUseCase } from '../application/update-goal.usecase';
import { AddContributionDto } from './dto/add-contribution.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Controller('goals')
export class GoalController {
  constructor(
    private readonly list: ListGoalsUseCase,
    private readonly addUc: AddContributionUseCase,
    private readonly createUc: CreateGoalUseCase,
    private readonly updateUc: UpdateGoalUseCase,
  ) {}

  @Get()
  findAll() {
    return this.list.execute();
  }

  @Post()
  @Roles('admin', 'editor')
  create(@Body() dto: CreateGoalDto) {
    return this.createUc.execute({ ...dto, subtitle: dto.subtitle ?? '' });
  }

  @Post(':slug/contributions')
  @Roles('admin', 'editor')
  async addContribution(@Param('slug') slug: string, @Body() dto: AddContributionDto) {
    await this.addUc.execute(slug, dto);
  }

  @Patch(':slug')
  @Roles('admin', 'editor')
  update(@Param('slug') slug: string, @Body() dto: UpdateGoalDto) {
    return this.updateUc.execute(slug, requireNonEmptyPatch(dto));
  }
}
