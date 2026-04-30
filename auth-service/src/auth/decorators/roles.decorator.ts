import { SetMetadata } from '@nestjs/common';
import { Role } from '../../entities/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorador para proteger endpoints por rol.
 * Usa jerarquía: OWNER > ADMIN > MEMBER > VIEWER
 *
 * Uso:
 * @Roles(Role.OWNER, Role.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('admin-only')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
