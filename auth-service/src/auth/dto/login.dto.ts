// ──────────────────────────────────────────────────────────
// apps/auth-service/src/auth/dto/login.dto.ts
// ──────────────────────────────────────────────────────────
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

// ──────────────────────────────────────────────────────────
// apps/auth-service/src/auth/dto/create-api-key.dto.ts
// ──────────────────────────────────────────────────────────
// import { IsString, MinLength, MaxLength, IsOptional, IsDateString } from 'class-validator';
//
// export class CreateApiKeyDto {
//   @IsString() @MinLength(3) @MaxLength(60)
//   name: string;
//
//   @IsOptional() @IsDateString()
//   expiresAt?: string;
// }
