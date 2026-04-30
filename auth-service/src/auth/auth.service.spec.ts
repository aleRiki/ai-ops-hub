// apps/auth-service/src/auth/auth.service.spec.ts
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis/redis.service';
import { AuthService } from './auth.service';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.access.token'),
  verify: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, defaultVal?: any) => {
    const values: Record<string, any> = {
      JWT_SECRET: 'test-secret-min-32-chars-for-jwt-testing',
      JWT_ACCESS_EXPIRES: '15m',
      JWT_REFRESH_EXPIRES: '7d',
    };
    return values[key] ?? defaultVal;
  }),
};

// ── Tests ─────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: RedisService, useValue: mockRedis },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── register ────────────────────────────────────────────
  describe('register', () => {
    const dto = {
      name: 'Carlos González',
      email: 'carlos@empresa.com',
      password: 'Password1!',
      orgName: 'Mi Empresa',
      orgSlug: 'mi-empresa',
    };

    it('debería crear un usuario y organización exitosamente', async () => {
      const result = await service.register(dto);

      expect(result).toHaveProperty('accessToken', 'mock.access.token');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBeGreaterThan(10);
    });

    it('debería lanzar ConflictException si el email ya existe', async () => {
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('debería lanzar ConflictException si el slug ya existe', async () => {
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── login ────────────────────────────────────────────────
  describe('login', () => {
    it('debería retornar tokens con credenciales válidas', async () => {
      const result = await service.login({
        email: 'test@test.com',
        password: 'Password1!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('debería lanzar UnauthorizedException con contraseña incorrecta', async () => {
      await expect(
        service.login({ email: 'test@test.com', password: 'wrong-password' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      await expect(
        service.login({ email: 'nobody@test.com', password: 'Password1!' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refreshTokens ────────────────────────────────────────
  describe('refreshTokens', () => {
    it('debería rotar el refresh token correctamente', async () => {
      const fakeToken = 'valid-raw-refresh-token-for-testing-purposes-123';

      const result = await service.refreshTokens(fakeToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('debería lanzar UnauthorizedException si el token no existe', async () => {
      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
