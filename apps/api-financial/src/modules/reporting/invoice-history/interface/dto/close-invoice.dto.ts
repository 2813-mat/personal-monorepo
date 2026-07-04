import { IsInt, Max, Min } from 'class-validator';

export class CloseInvoiceDto {
  @IsInt() year!: number;
  @IsInt() @Min(1) @Max(12) month!: number;
}
