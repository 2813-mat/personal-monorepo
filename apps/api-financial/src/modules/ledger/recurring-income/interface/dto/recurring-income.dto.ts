import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRecurringIncomeDto {
  @IsString() label!: string;
  @IsIn(['Mateus', 'Thais', 'shared']) holder!: string;
  @IsNumber() @Min(0) value!: number;
  @IsInt() @Min(1) @Max(31) day!: number;
  /** Ausente = começa a valer no mês corrente. */
  @IsOptional() @IsDateString() startDate?: string;
}

export class UpdateRecurringIncomeDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsIn(['Mateus', 'Thais', 'shared']) holder?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) day?: number;
}
