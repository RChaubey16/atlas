# Atlas — Project Context for Claude Code

## What This Project Is

**Atlas** is a NestJS microservices backend portfolio project demonstrating service boundaries, API Gateway pattern, event contracts, and clean NestJS modular design.

## Current State (as of 2026-04-09)

Phase 1 MVP and Notification Service are **complete and merged to `main`**.

- NestJS monorepo with 4 apps and 1 shared library
- Full auth flow: register, login, refresh tokens (JWT + bcrypt)
- Content CRUD with ownership validation
- API Gateway proxying all traffic with JWT guard
- Notification Service — RabbitMQ microservice that sends welcome emails on `user.created`
- Auth Service publishes `user.created` events to RabbitMQ via `ClientProxy`
- Docker Compose running all 6 services (gateway, auth, content, postgres, rabbitmq, notification)
- Prisma v7 with `@prisma/adapter-pg` (driver adapter required — no `url` in schema)
- `prisma generate` runs in Dockerfile (required before TypeScript compilation)

## Architecture

```
Client → API Gateway (port 3000) → Auth Service (port 3001)
                                 → Content Service (port 3002)
                                         ↓
                                    PostgreSQL (port 5432)

Auth Service --[user.created]--> RabbitMQ (port 5672) --> Notification Service --> SMTP
```

## Monorepo Structure

```
apps/
 ├── gateway/              # Port 3000 — JWT guard, proxies all routes via HTTP
 ├── auth-service/         # Port 3001 — register, login, refresh, JWT, bcrypt, Prisma; publishes user.created
 ├── content-service/      # Port 3002 — create/fetch content, ownership validation
 └── notification-service/ # No HTTP port — RabbitMQ microservice; consumes user.created, sends email

libs/
 └── contracts/            # Shared event types (@app/contracts path alias)

prisma/
 └── schema.prisma         # User and Content models (no url= in datasource — Prisma v7)

plan/
 └── Phase-1.md            # Original MVP plan (complete)
```

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | NestJS 11 (monorepo mode) |
| Language | TypeScript |
| ORM | Prisma v7 + `@prisma/adapter-pg` |
| Database | PostgreSQL 16 |
| Auth | JWT (access 15min + refresh 7d), bcrypt |
| HTTP between services | `@nestjs/axios` (HttpService) |
| Message broker | RabbitMQ + `@nestjs/microservices` (Transport.RMQ) |
| Email | Nodemailer (SMTP) |
| Package Manager | pnpm |
| Containerization | Docker Compose |
| Caching (future) | Redis |

## Key Gotchas

- **Prisma v7** — `url` is no longer allowed in `prisma/schema.prisma`. The DB connection is passed via `PrismaPg` adapter in `PrismaService` constructor.
- **`prisma generate` in Docker** — must run after `COPY . .` in the Dockerfile, before any TypeScript build or watch. Without it, `@prisma/client` exports nothing.
- **Module resolution** — uses `"module": "commonjs"` (not `nodenext`). Changed during monorepo conversion for compatibility with path aliases.
- **JWT `expiresIn`** — must be a number (seconds), not a string like `'15m'`, due to `@nestjs/jwt` v11 type constraints.
- **Notification Service has no HTTP port** — it bootstraps with `NestFactory.createMicroservice()`, not `NestFactory.create()`. It has no `listen(port)` call and cannot be reached via HTTP.
- **`ClientProxy.emit()` is fire-and-forget** — returns an Observable that does not need to be subscribed. The RabbitMQ transport buffers the message. Do not `await` or `.subscribe()` unless you need delivery confirmation.
- **RabbitMQ must be healthy before auth-service starts** — docker-compose `depends_on: rabbitmq: condition: service_healthy` ensures this. Locally, start RabbitMQ before running auth-service.

## Key Files

| File | Purpose |
|---|---|
| `nest-cli.json` | Monorepo config — all apps and libs registered here |
| `tsconfig.json` | Root TS config — includes `@app/contracts` path alias |
| `prisma/schema.prisma` | DB schema — User and Content models |
| `docker-compose.yml` | All 6 services wired together (includes rabbitmq + notification-service) |
| `Dockerfile` | Dev image — includes `prisma generate` |
| `Dockerfile.prod` | Multi-stage production image |
| `.env` | Local env vars (not committed) — see below |
| `docs/notes.md` | Plain-English project overview |
| `docs/nest-notes.md` | NestJS concepts explained with code examples |
| `docs/api-guide.md` | Postman guide for all endpoints |

## Environment Variables (`.env`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/atlas?schema=public"
JWT_ACCESS_SECRET="atlas-access-secret-change-in-production"
JWT_REFRESH_SECRET="atlas-refresh-secret-change-in-production"
GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
CONTENT_SERVICE_PORT=3002
AUTH_SERVICE_URL="http://localhost:3001"
CONTENT_SERVICE_URL="http://localhost:3002"

# RabbitMQ (notification-service + auth-service)
RABBITMQ_URL="amqp://localhost:5672"

# SMTP (notification-service)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="<your-smtp-user>"
SMTP_PASS="<your-app-password>"
SMTP_FROM="Atlas <no-reply@example.com>"
```

Docker Compose overrides `AUTH_SERVICE_URL`, `CONTENT_SERVICE_URL`, `DATABASE_URL`, and `RABBITMQ_URL` to use container names internally.

## API Endpoints (all via Gateway on port 3000)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | No | Register, returns token pair |
| POST | `/auth/login` | No | Login, returns token pair |
| POST | `/auth/refresh` | No | Swap refresh token for new pair |
| POST | `/content` | Bearer token | Create content item |
| GET | `/content` | Bearer token | List own content |
| GET | `/content/:id` | Bearer token | Get one content item |

## Commands

```bash
# Docker (recommended)
docker compose up                        # start all services
docker compose build --no-cache          # rebuild images (after Dockerfile changes)
docker compose down                      # stop all services

# Database
npx prisma migrate dev                   # run migrations (first time)
npx prisma generate                      # regenerate client after schema changes

# Local dev (individual services)
pnpm run start:gateway                   # gateway on port 3000
pnpm run start:auth                      # auth-service on port 3001
pnpm run start:content                   # content-service on port 3002
pnpm run start:notification              # notification-service (requires RabbitMQ running)

# Build
pnpm run build:gateway
pnpm run build:auth
pnpm run build:content
pnpm run build:notification

# Test & lint
pnpm test
pnpm run lint
```

## Future Extensions

- URL Shortener Service — creates/resolves short links with 30-day expiry and click analytics
- Job Worker Service — background queues
- Redis caching layer
- RBAC permissions
- Multi-tenancy
