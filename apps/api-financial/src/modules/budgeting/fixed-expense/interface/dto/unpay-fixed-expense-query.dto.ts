import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/**
 * Ano e mês são obrigatórios aqui, ao contrário da listagem: apagar o pagamento
 * do mês errado por omissão de parâmetro é destrutivo e silencioso.
 */
export class UnpayFixedExpenseQueryDto {
  @Type(() => Number) @IsInt() year!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
}
