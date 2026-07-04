import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListGoalsUseCase } from '../application/list-goals.usecase';
import { AddContributionUseCase } from '../application/add-contribution.usecase';
import { AddContributionDto } from './dto/add-contribution.dto';

@Controller('goals')
export class GoalController {
  constructor(
    private readonly list: ListGoalsUseCase,
    private readonly addUc: AddContributionUseCase,
  ) {}

  @Get()
  findAll() {
    return this.list.execute();
  }

  @Post(':id/contributions')
  @Roles('admin', 'editor')
  async addContribution(@Param('id') id: string, @Body() dto: AddContributionDto) {
    await this.addUc.execute(id, dto);
  }
}
