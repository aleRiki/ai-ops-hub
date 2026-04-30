import { IsString, MinLength, MaxLength, IsOptional, IsDateString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
