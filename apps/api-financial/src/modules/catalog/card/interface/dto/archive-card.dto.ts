import { IsBoolean } from 'class-validator';

export class ArchiveCardDto {
  @IsBoolean() archived!: boolean;
}
