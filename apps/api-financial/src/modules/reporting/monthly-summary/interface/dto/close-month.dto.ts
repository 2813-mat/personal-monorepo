import { IsInt, Max, Min } from 'class-validator';

export class CloseMonthDto {
  @IsInt() year!: number;
  @IsInt() @Min(1) @Max(12) month!: number;
}
