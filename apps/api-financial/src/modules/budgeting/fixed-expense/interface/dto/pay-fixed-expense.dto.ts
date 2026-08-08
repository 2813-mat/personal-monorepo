import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PayFixedExpenseDto {
  /** Data em que o pagamento saiu. A competência do pagamento vem dela. */
  @IsDateString() date!: string;
  /** Ausente = o valor do cadastro. Informado quando a conta veio diferente. */
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsIn(['PIX', 'CARD']) method!: 'PIX' | 'CARD';
  @IsOptional() @IsString() cardId?: string;
}
