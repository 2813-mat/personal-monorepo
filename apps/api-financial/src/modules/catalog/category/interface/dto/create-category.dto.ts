import { IsHexColor, IsNumber, IsString, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString() slug!: string;
  @IsString() label!: string;
  @IsHexColor() color!: string;
  @IsNumber() @Min(0) budget!: number;
}
