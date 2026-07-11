import { IsBoolean, IsDateString, IsNumber, IsString, Min } from 'class-validator';

export class CreateIncomeDto {
  @IsString() label!: string;
  @IsString() holder!: string;
  @IsNumber() @Min(0) value!: number;
  @IsDateString() date!: string;
  @IsBoolean() recurring!: boolean;
}
