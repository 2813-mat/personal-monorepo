import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateFixedExpenseDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() holder?: string;
}
