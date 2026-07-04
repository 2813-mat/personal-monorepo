import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class TransactionQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @IsOptional() @Type(() => Number) @IsInt() month?: number;
  @IsOptional() @IsString() holder?: string;
  @IsOptional() @IsString() cat?: string;
  @IsOptional() @IsString() method?: string;
}
