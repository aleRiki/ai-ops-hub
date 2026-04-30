import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ApiKey } from '../entities/apikey.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

const KEY_PREFIX = 'aiops_';
const KEY_BYTES = 32;

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async create(dto: CreateApiKeyDto, userId: string, orgId: string) {
    // Generar clave cruda: aiops_<32bytes hex>
    const rawKey = KEY_PREFIX + crypto.randomBytes(KEY_BYTES).toString('hex');
    const keyHash = this.hashKey(rawKey);
    const prefix = rawKey.substring(0, 12); // "aiops_ab1cd2" para mostrar en UI

    const apiKey = this.apiKeyRepo.create({
      name: dto.name,
      keyHash,
      prefix,
      userId,
      orgId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    await this.apiKeyRepo.save(apiKey);

    // ⚠️ Solo se retorna la clave completa en la creación — nunca más
    return {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: rawKey,         // mostrar UNA sola vez al usuario
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
    };
  }

  async listByUser(userId: string) {
    const keys = await this.apiKeyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Nunca devolver el hash, solo metadata
    return keys.map(({ keyHash: _, ...safe }) => safe);
  }

  async revoke(id: string, userId: string) {
    const apiKey = await this.apiKeyRepo.findOne({ where: { id } });

    if (!apiKey) throw new NotFoundException('API key no encontrada');
    if (apiKey.userId !== userId)
      throw new ForbiddenException('No puedes revocar esta API key');

    await this.apiKeyRepo.delete({ id });
  }

  /** Usado por ApiKeyGuard para validar la clave entrante */
  async validateKey(rawKey: string): Promise<ApiKey | null> {
    const keyHash = this.hashKey(rawKey);
    const apiKey = await this.apiKeyRepo.findOne({
      where: { keyHash },
      relations: ['user', 'org'],
    });

    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Actualizar lastUsed sin bloquear la respuesta
    this.apiKeyRepo.update({ id: apiKey.id }, { lastUsed: new Date() });
    return apiKey;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
