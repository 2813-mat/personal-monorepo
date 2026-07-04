import { IsDateString, IsNumber, Min } from 'class-validator';

export class AddContributionDto {
  @IsNumber() @Min(0) amount!: number;
  @IsDateString() date!: string;
}
