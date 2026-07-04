import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateIncomeDto {
  @IsString() label!: string;
  @IsOptional() @IsString() memberId?: string;
  @IsNumber() @Min(0) value!: number;
  @IsDateString() date!: string;
  @IsBoolean() recurring!: boolean;
}
