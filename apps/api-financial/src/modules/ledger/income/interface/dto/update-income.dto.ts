import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateIncomeDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsIn(['Mateus', 'Thais', 'shared']) holder?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsDateString() date?: string;
}
