# auth-service

Servicio de autenticación e identidad del AI Operations Hub.

## Setup rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (mínimo: JWT_SECRET con 32+ chars)

# 3. Levantar infraestructura
docker compose -f docker-compose.dev.yml up -d

# 4. Correr migraciones
npx prisma migrate dev --name init

# 5. Generar cliente Prisma
npx prisma generate

# 6. Iniciar el servicio
npm run start:dev
```

## Endpoints disponibles

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | — | Registro + crea organización |
| POST | /api/v1/auth/login | — | Login → access + refresh token |
| POST | /api/v1/auth/refresh | RT cookie | Rotar token pair |
| POST | /api/v1/auth/logout | Bearer | Revocar sesión |
| GET | /api/v1/auth/me | Bearer | Usuario autenticado |
| GET | /api/v1/auth/verify | Bearer | Verificar token (para gateway) |
| POST | /api/v1/auth/api-keys | Bearer | Crear API key |
| GET | /api/v1/auth/api-keys | Bearer | Listar API keys |
| DELETE | /api/v1/auth/api-keys/:id | Bearer | Revocar API key |

## Tests

```bash
# Unitarios
npm test

# Con coverage (mínimo 80%)
npm run test:cov
```

## Generar JWT_SECRET seguro

```bash
openssl rand -base64 32
```
