import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class InstallmentsDto {
  @IsInt() @Min(1) n!: number;
  @IsInt() @Min(1) of!: number;
}

export class CreateTransactionDto {
  @IsDateString() date!: string;
  @IsString() label!: string;
  @IsNumber() value!: number;
  @IsString() categorySlug!: string;
  @IsOptional() @IsString() memberId?: string;
  @IsIn(['PIX', 'CARD']) method!: 'PIX' | 'CARD';
  @IsOptional() @IsString() cardId?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsBoolean() recurring?: boolean;
  @IsOptional() @IsString() fixedExpenseId?: string;
  @IsOptional() @ValidateNested() @Type(() => InstallmentsDto) installments?: InstallmentsDto;
}
