import { IsHexColor, IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional() @IsString() label?: string;
  // `IsPositive` e não `Min(0)`: zerar objetivo ou aporte por PATCH recriaria
  // pela porta de trás o NaN%/∞ meses que a criação já barra.
  @IsOptional() @IsNumber() @IsPositive() target?: number;
  @IsOptional() @IsNumber() @IsPositive() monthly?: number;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsIn(['SONHO', 'EMERGENCIA']) type?: 'SONHO' | 'EMERGENCIA';
}
