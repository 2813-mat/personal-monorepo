import { IsHexColor, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsNumber() @Min(0) budget?: number;
}
