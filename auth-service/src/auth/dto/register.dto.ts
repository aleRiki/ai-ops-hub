// ──────────────────────────────────────────────────────────
// apps/auth-service/src/auth/dto/register.dto.ts
// ──────────────────────────────────────────────────────────
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'La contraseña debe tener al menos una mayúscula, una minúscula y un número',
  })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  orgName!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones',
  })
  @MinLength(3)
  @MaxLength(40)
  orgSlug!: string;
}
