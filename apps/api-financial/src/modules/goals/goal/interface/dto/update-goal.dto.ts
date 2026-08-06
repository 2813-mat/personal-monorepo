import { IsHexColor, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsNumber() @Min(0) target?: number;
  @IsOptional() @IsNumber() @Min(0) monthly?: number;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsIn(['SONHO', 'EMERGENCIA']) type?: 'SONHO' | 'EMERGENCIA';
}
