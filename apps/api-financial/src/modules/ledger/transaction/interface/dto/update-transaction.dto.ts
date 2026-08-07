import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTransactionDto {
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() holder?: string;
  @IsOptional() @IsIn(['PIX', 'CARD']) method?: 'PIX' | 'CARD';
  @IsOptional() @IsString() cardId?: string | null;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsBoolean() reviewed?: boolean;
}
