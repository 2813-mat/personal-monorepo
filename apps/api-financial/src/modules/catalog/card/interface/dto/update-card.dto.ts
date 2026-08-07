import {
  IsHexColor,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateCardDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() bank?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) closingDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'last4 deve ter exatamente 4 dígitos' })
  last4?: string;
  @IsOptional() @IsIn(['Mateus', 'Thais', 'shared']) holder?: string;
}
