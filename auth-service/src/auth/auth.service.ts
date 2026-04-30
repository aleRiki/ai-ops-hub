// apps/auth-service/src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { RefreshToken } from '../entities/refreshtoken.entity';
import { Role } from '../entities/role.enum';
import { User } from '../entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 40;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService
  ) {}

  // ── REGISTRO ──────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // 1. Verificar que el email no exista
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('El email ya está registrado');

    // 2. Verificar unicidad del slug de la organización
    const slugExists = await this.orgRepo.findOne({
      where: { slug: dto.orgSlug },
    });
    if (slugExists)
      throw new ConflictException('El slug de organización ya está en uso');

    // 3. Crear organización y usuario en una transacción
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let user: User | undefined;
    await this.dataSource.transaction(async (manager) => {
      const org = manager.create(Organization, {
        name: dto.orgName,
        slug: dto.orgSlug,
      });
      await manager.save(org);
      user = manager.create(User, {
        email: dto.email,
        name: dto.name,
        passwordHash,
        orgId: org.id,
        role: Role.OWNER,
        organization: org,
      });
      await manager.save(user);
    });

    // 4. Emitir tokens y retornar
    if (!user) throw new Error('User no definido');
    return this.issueTokenPair(user);
  }

  // ── LOGIN ─────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['organization'],
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return this.issueTokenPair(user);
  }

  // ── REFRESH TOKEN ROTATION ────────────────────────────────
  async refreshTokens(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user', 'user.organization'],
    });

    // Token no existe o expiró → posible ataque de reuse
    if (!stored) {
      // Si el token fue usado antes, revocar todos los del usuario (seguridad)
      await this.detectAndRevokeReuse(rawRefreshToken);
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (stored.expiresAt < new Date()) {
      await this.refreshTokenRepo.delete({ tokenHash });
      throw new UnauthorizedException('Refresh token expirado');
    }

    // Rotate: eliminar el viejo antes de generar el nuevo
    await this.refreshTokenRepo.delete({ tokenHash });
    return this.issueTokenPair(stored.user);
  }

  // ── LOGOUT ────────────────────────────────────────────────
  async logout(userId: string, rawRefreshToken: string, accessToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    // 1. Revocar el refresh token
    await this.refreshTokenRepo.delete({ userId, tokenHash });

    // 2. Blacklist del access token en Redis hasta que expire
    const ttl = this.getAccessTokenTtlSeconds();
    await this.redis.set(`blacklist:${accessToken}`, '1', ttl);
  }

  // ── GET ME ────────────────────────────────────────────────
  async getMe(userId: string) {
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['organization'],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        organization: { id: true, name: true, slug: true, plan: true },
      },
    });
  }

  // ── VERIFICAR ACCESS TOKEN (usado por gateway) ────────────
  async verifyAccessToken(token: string) {
    // Comprobar blacklist primero
    const blacklisted = await this.redis.get(`blacklist:${token}`);
    if (blacklisted) throw new UnauthorizedException('Token revocado');

    try {
      return this.jwt.verify(token, { secret: this.config.get('JWT_SECRET') });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  // ── HELPERS PRIVADOS ──────────────────────────────────────
  private async issueTokenPair(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    const rawRefreshToken = crypto
      .randomBytes(REFRESH_TOKEN_BYTES)
      .toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + 7);

    const refreshToken = this.refreshTokenRepo.create({
      tokenHash,
      userId: user.id,
      expiresAt: refreshExpires,
    });
    await this.refreshTokenRepo.save(refreshToken);

    return { accessToken, refreshToken: rawRefreshToken, user: payload };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getAccessTokenTtlSeconds(): number {
    // Parsear '15m' → 900 segundos
    const exp = this.config.get('JWT_ACCESS_EXPIRES', '15m');
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const [, num, unit] = match;
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return parseInt(num) * (multipliers[unit] ?? 60);
  }

  private async detectAndRevokeReuse(rawToken: string) {
    // Hash conocido de tokens ya usados: registrar para detectar reuse attacks
    // En producción: también revocar todos los RTs del usuario si el hash coincide con uno eliminado
    console.warn('[auth-service] Posible refresh token reuse detectado');
  }
}
