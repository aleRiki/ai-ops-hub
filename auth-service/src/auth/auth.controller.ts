// apps/auth-service/src/auth/auth.controller.ts
import {
  Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus,
  UseGuards, Delete, Param,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

// Tiempo de vida de la cookie de refresh token (7 días en ms)
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly apiKeys: ApiKeysService,
  ) {}

  // POST /auth/register
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  // POST /auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  // POST /auth/refresh  — el RT viene en cookie httpOnly
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refreshToken'];
    if (!refreshToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Refresh token no encontrado' });
      return;
    }
    const result = await this.auth.refreshTokens(refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  // POST /auth/logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    const accessToken = req.headers.authorization?.replace('Bearer ', '') ?? '';
    await this.auth.logout(user.sub, refreshToken, accessToken);
    res.clearCookie('refreshToken');
  }

  // GET /auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return this.auth.getMe(user.sub);
  }

  // GET /auth/verify  — usado internamente por el gateway
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verify(@CurrentUser() user: any) {
    // Si llega aquí, el JwtAuthGuard ya validó el token
    return user;
  }

  // POST /auth/api-keys
  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  createApiKey(@Body() dto: CreateApiKeyDto, @CurrentUser() user: any) {
    return this.apiKeys.create(dto, user.sub, user.orgId);
  }

  // GET /auth/api-keys
  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  listApiKeys(@CurrentUser() user: any) {
    return this.apiKeys.listByUser(user.sub);
  }

  // DELETE /auth/api-keys/:id
  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeApiKey(@Param('id') id: string, @CurrentUser() user: any) {
    return this.apiKeys.revoke(id, user.sub);
  }

  // ── Helpers ──────────────────────────────────────────────
  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,                         // no accesible desde JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: '/api/v1/auth/refresh',           // scope mínimo: solo la ruta de refresh
    });
  }
}
