import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateFixedExpenseDto {
  @IsString() label!: string;
  @IsNumber() @Min(0) value!: number;
  @IsInt() @Min(1) @Max(31) dueDay!: number;
  @IsString() categorySlug!: string;
  @IsOptional() @IsString() memberId?: string;
}
