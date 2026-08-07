import { IsHexColor, IsIn, IsInt, IsNumber, IsString, Matches, Max, Min } from 'class-validator';

export class CreateCardDto {
  @IsString() name!: string;
  @IsString() bank!: string;
  @IsHexColor() color!: string;
  @IsInt() @Min(1) @Max(31) closingDay!: number;
  @IsInt() @Min(1) @Max(31) dueDay!: number;
  @IsNumber() @Min(0) creditLimit!: number;
  // Quatro dígitos, não "quatro caracteres": '12a4' não é final de cartão.
  @Matches(/^\d{4}$/, { message: 'last4 deve ter exatamente 4 dígitos' }) last4!: string;
  @IsIn(['Mateus', 'Thais', 'shared']) holder!: string;
}
