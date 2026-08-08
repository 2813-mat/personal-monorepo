import { IsHexColor, IsIn, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateGoalDto {
  @IsString() @MinLength(1) label!: string;
  /** A coluna é NOT NULL sem default; ausente vira string vazia no caso de uso. */
  @IsOptional() @IsString() subtitle?: string;
  // Zero não é meta: o card divide o saldo pelo objetivo e o prazo pelo aporte.
  @IsNumber() @IsPositive() target!: number;
  @IsNumber() @IsPositive() monthly!: number;
  @IsHexColor() color!: string;
  @IsIn(['SONHO', 'EMERGENCIA']) type!: 'SONHO' | 'EMERGENCIA';
}
