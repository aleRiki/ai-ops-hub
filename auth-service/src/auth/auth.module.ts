import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../entities/apikey.entity';
import { Organization } from '../entities/organization.entity';
import { RefreshToken } from '../entities/refreshtoken.entity';
import { User } from '../entities/user.entity';
import { RedisModule } from '../redis/redis.module';
import { ApiKeysService } from './api-keys.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User, Organization, RefreshToken, ApiKey]),
    JwtModule.register({}),
    RedisModule,
  ],
  providers: [AuthService, ApiKeysService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
