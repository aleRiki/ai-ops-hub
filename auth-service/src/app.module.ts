// apps/auth-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { ApiKey } from './entities/apikey.entity';
import { OAuthAccount } from './entities/oauthaccount.entity';
import { Organization } from './entities/organization.entity';
import { RefreshToken } from './entities/refreshtoken.entity';
import { User } from './entities/user.entity';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // ── Configuración con validación al arranque ──────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        APP_PORT: Joi.number().default(3001),
        APP_CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
        DATABASE_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
        GOOGLE_CLIENT_ID: Joi.string().optional(),
        GOOGLE_CLIENT_SECRET: Joi.string().optional(),
        GITHUB_CLIENT_ID: Joi.string().optional(),
        GITHUB_CLIENT_SECRET: Joi.string().optional(),
      }),
    }),

    // ── Rate limiting global ──────────────────────────────
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // ── Módulos de la aplicación ──────────────────────────
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Organization, RefreshToken, OAuthAccount, ApiKey],
      synchronize: true, // Solo para desarrollo, en producción usar migraciones
    }),
    RedisModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
