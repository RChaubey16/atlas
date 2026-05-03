# Atlas — Project Context for Claude Code

## What This Project Is

**Atlas** is a NestJS microservices backend portfolio project demonstrating service boundaries, API Gateway pattern, event contracts, Google OAuth, cookie-based auth, and clean NestJS modular design.

## Current State (as of 2026-05-03)

All features are **complete and merged to `main`**.

- NestJS monorepo with 5 apps and 1 shared library
- Full auth flow: register, login, refresh tokens (JWT + bcrypt)
- Google OAuth 2.0 via Passport — gateway owns the flow, auth-service owns identity
- Tokens delivered as `httpOnly` cookies (browser) or JSON (API clients) — JwtStrategy accepts both
- CORS configured with `credentials: true` and `ALLOWED_ORIGINS` allowlist for `*.ruturaj.xyz` subdomains
- Content CRUD with ownership validation
- URL Shortener — create/list/delete short links, click tracking, 30-day expiry, nightly cleanup cron
- API Gateway proxying all traffic with JWT guard; serves `GET /templates` and `GET /templates/:id/preview` (no auth required)
- Notification Service — hybrid service: RabbitMQ microservice (consumes `user.created`, sends welcome email via Resend) **and** HTTP server on port 3004 (accepts `POST /notify/send` with internal key auth)
- Auth Service publishes `user.created` events to RabbitMQ via `ClientProxy`
- Template definitions live in `libs/contracts` — shared between gateway (serves them over HTTP) and notification service (uses them to send mail)
- `SendEmailCommand` contract in `libs/contracts` — used by gateway → notification service for on-demand email sends
- Docker Compose running all 7 services (gateway, auth, content, url-shortener, postgres, rabbitmq, notification)
- Prisma v7 with `@prisma/adapter-pg` (driver adapter required — no `url` in schema)
- `prisma generate` runs in Dockerfile (required before TypeScript compilation)
- Gateway built with webpack (`"webpack": true` in `nest-cli.json`) — output goes to `dist/apps/gateway/main.js`
- Health endpoints on all services (`GET /health`); gateway also has `GET /health/ready` (readiness via @nestjs/terminus)
- Rate limiting: `ThrottlerModule` global guard at 100 req/min, keyed by `userId` (authed) or IP (anon)
- Structured HTTP logging: `HttpLoggingInterceptor` on gateway logs `METHOD URL STATUS +Xms` for every request
- Gateway config validated at startup with Joi schema

## Architecture

```
Client / Browser
       │
       ▼
  API Gateway (port 3000) → Auth Service (port 3001)         → PostgreSQL
                           → Content Service (port 3002)      → PostgreSQL
                           → URL Shortener (port 3003)        → PostgreSQL
                           → Notification Service (port 3004) ← x-internal-key

Auth Service --[user.created]--> RabbitMQ (port 5672) --> Notification Service --> Resend API
```

## Monorepo Structure

```
apps/
 ├── gateway/              # Port 3000 — CORS, cookie-parser, JWT + Google strategies, throttling, logging, proxies all routes
 ├── auth-service/         # Port 3001 — register, login, refresh, Google find-or-create, JWT, bcrypt, Prisma
 ├── content-service/      # Port 3002 — create/fetch content, ownership validation
 ├── url-shortener/        # Port 3003 — short links, click events, nightly cleanup cron
 └── notification-service/ # Port 3004 (HTTP) + RabbitMQ — consumes user.created, POST /notify/send (internal key), sends email

libs/
 └── contracts/            # Shared event types, commands, and template definitions (@app/contracts path alias)

prisma/
 └── schema.prisma         # User, Content, ShortLink, ClickEvent models (no url= in datasource — Prisma v7)

docs/
 ├── notes.md              # Plain-English project overview
 ├── nest-notes.md         # NestJS concepts explained with code examples
 └── api-guide.md          # Full API reference (Postman + browser workflows)

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
| Auth | JWT (access 15min + refresh 7d), bcrypt, Google OAuth 2.0 (Passport) |
| Auth transport | `httpOnly` cookies (browser) + `Authorization: Bearer` header (API clients) |
| HTTP between services | `@nestjs/axios` (HttpService) |
| Message broker | RabbitMQ + `@nestjs/microservices` (Transport.RMQ) |
| Email | Resend SDK (`resend` package) |
| Rate limiting | `@nestjs/throttler` — 100 req/min global, keyed by userId or IP |
| Health checks | `@nestjs/terminus` — liveness + readiness on all services |
| Config validation | Joi via `ConfigModule.forRoot({ validationSchema })` on gateway |
| Package Manager | pnpm |
| Containerization | Docker Compose |
| Caching (future) | Redis |

## Key Gotchas

- **Prisma v7** — `url` is no longer allowed in `prisma/schema.prisma`. The DB connection is passed via `PrismaPg` adapter in `PrismaService` constructor.
- **`prisma generate` in Docker** — must run after `COPY . .` in the Dockerfile, before any TypeScript build or watch. Without it, `@prisma/client` exports nothing.
- **Module resolution** — uses `"module": "commonjs"` (not `nodenext`). Changed during monorepo conversion for compatibility with path aliases.
- **JWT `expiresIn`** — must be a number (seconds), not a string like `'15m'`, due to `@nestjs/jwt` v11 type constraints.
- **Notification Service is now a hybrid app** — bootstraps with `NestFactory.create()`, then calls `app.connectMicroservice()` for RabbitMQ and `app.listen(3004)` for HTTP. It is no longer pure microservice-only.
- **Internal key auth on notification service** — `POST /notify/send` requires `x-internal-key` header matching `INTERNAL_NOTIFICATION_KEY`. The gateway injects this automatically via `NotificationProxyService`.
- **`ClientProxy.emit()` is fire-and-forget** — returns an Observable that does not need to be subscribed. The RabbitMQ transport buffers the message. Do not `await` or `.subscribe()` unless you need delivery confirmation.
- **RabbitMQ must be healthy before auth-service starts** — docker-compose `depends_on: rabbitmq: condition: service_healthy` ensures this. Locally, start RabbitMQ before running auth-service.
- **`prisma migrate deploy` in Docker** — the auth-service container runs `npx prisma migrate deploy` before starting. This is the production-safe migration command (no prompts, no schema drift check).
- **Gateway `PORT` env var** — `main.ts` reads `process.env.PORT ?? process.env.GATEWAY_PORT ?? 3000`. Cloud platforms (Railway, Render, etc.) inject `PORT` automatically; local dev still uses `GATEWAY_PORT`.
- **`cookie-parser` import** — must use `import cookieParser = require('cookie-parser')` (not `import * as cookieParser`) due to `commonjs` module mode. `import * as` causes a TS2349 "not callable" error at compile time.
- **Google OAuth `state` param** — `GoogleAuthGuard` overrides `getAuthenticateOptions` to forward `req.query.redirect` as the OAuth `state`. Google round-trips `state` unchanged, so the callback reads it from `req.query.state` to know where to redirect.
- **`passport-google-oauth20` strategy name** — must pass `'google'` as the second arg: `PassportStrategy(Strategy, 'google')`. Without it the strategy name defaults and `AuthGuard('google')` won't find it.
- **CORS `credentials: true`** — required for browsers to send cookies cross-origin. Every allowed frontend must be in `ALLOWED_ORIGINS`. If `ALLOWED_ORIGINS` is empty, CORS is disabled entirely (safe default).
- **`passwordHash` is nullable** — Google-only users have no password. `login()` guards against this: if `!user.passwordHash` it returns 401. Never call `bcrypt.compare` on a null hash.
- **Gateway Joi validation** — `INTERNAL_NOTIFICATION_KEY`, `JWT_ACCESS_SECRET`, `AUTH_SERVICE_URL`, `CONTENT_SERVICE_URL`, `URL_SHORTENER_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` are required at startup. Missing any of these crashes the gateway immediately.
- **`UserThrottlerGuard`** — extends `ThrottlerGuard` to key by `req.user.userId` when JWT is present, falling back to IP. This means authenticated users share a per-user bucket (not per-IP).

## Key Files

| File | Purpose |
|---|---|
| `nest-cli.json` | Monorepo config — all apps and libs registered here |
| `tsconfig.json` | Root TS config — includes `@app/contracts` path alias |
| `prisma/schema.prisma` | DB schema — User, Content, ShortLink, ClickEvent models |
| `docker-compose.yml` | All 7 services wired together |
| `Dockerfile` | Dev image — includes `prisma generate` |
| `Dockerfile.prod` | Multi-stage production image |
| `.env` | Local env vars (not committed) |
| `.env.example` | Committed template for all required env vars |
| `apps/gateway/src/main.ts` | Bootstrap — cookie-parser, CORS, logging interceptor, Swagger |
| `apps/gateway/src/app.module.ts` | ThrottlerModule config + Joi validation schema |
| `apps/gateway/src/common/http-logging.interceptor.ts` | Global HTTP log: `METHOD URL STATUS +Xms` |
| `apps/gateway/src/common/user-throttler.guard.ts` | Throttle by userId (authed) or IP (anon) |
| `apps/gateway/src/health/health.controller.ts` | `GET /health` (liveness) + `GET /health/ready` (readiness — pings downstream) |
| `apps/gateway/src/auth/strategies/google.strategy.ts` | Passport Google OAuth 2.0 strategy |
| `apps/gateway/src/auth/guards/google-auth.guard.ts` | GoogleAuthGuard — passes `?redirect` as OAuth state |
| `apps/gateway/src/auth/jwt.strategy.ts` | JwtStrategy — extracts token from cookie first, then Bearer header |
| `apps/gateway/src/notification/notification-proxy.controller.ts` | `POST /notify/send` — JWT-protected, proxies to notification service |
| `apps/gateway/src/notification/notification-proxy.service.ts` | Forwards SendEmailCommand with `x-internal-key` header |
| `apps/auth-service/src/auth/auth.service.ts` | Core auth logic including `findOrCreateGoogleUser` |
| `apps/notification-service/src/notification/notification.controller.ts` | RMQ `user.created` handler + HTTP `POST /notify/send` |
| `apps/notification-service/src/guards/internal-key.guard.ts` | Validates `x-internal-key` against `INTERNAL_NOTIFICATION_KEY` |
| `apps/gateway/src/templates/templates.controller.ts` | Serves `GET /templates` and `GET /templates/:id/preview` |
| `libs/contracts/src/templates/registry.ts` | TEMPLATES map — single source of truth for all email templates |
| `libs/contracts/src/commands/send-email.command.ts` | `SendEmailCommand` — used for on-demand email via gateway |
| `docs/notes.md` | Plain-English project overview |
| `docs/nest-notes.md` | NestJS concepts explained with code examples |
| `docs/api-guide.md` | Full API reference (Postman + browser workflows) |

## Environment Variables (`.env`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/atlas?schema=public"
JWT_ACCESS_SECRET="atlas-access-secret-change-in-production"
JWT_REFRESH_SECRET="atlas-refresh-secret-change-in-production"
GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
CONTENT_SERVICE_PORT=3002
URL_SHORTENER_PORT=3003
NOTIFICATION_SERVICE_PORT=3004
AUTH_SERVICE_URL="http://localhost:3001"
CONTENT_SERVICE_URL="http://localhost:3002"
URL_SHORTENER_URL="http://localhost:3003"
NOTIFICATION_SERVICE_URL="http://localhost:3004"

# Internal service-to-service auth (notification service)
# Generate with: openssl rand -hex 32
INTERNAL_NOTIFICATION_KEY="<random-hex-32>"

# RabbitMQ (notification-service + auth-service)
RABBITMQ_URL="amqp://guest:guest@localhost:5672"

# Resend (notification-service)
RESEND_API_KEY="<your-resend-api-key>"
SMTP_FROM="Atlas <no-reply@yourdomain.com>"

# Google OAuth (gateway)
GOOGLE_CLIENT_ID="<your-google-client-id>"
GOOGLE_CLIENT_SECRET="<your-google-client-secret>"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

# CORS + frontend (gateway)
NODE_ENV="development"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
FRONTEND_URL="http://localhost:5173"
```

Docker Compose overrides service URLs and `DATABASE_URL` to use container names internally. `RESEND_API_KEY`, `SMTP_FROM`, Google vars, CORS vars, and `INTERNAL_NOTIFICATION_KEY` are passed through from the host `.env`.

## API Endpoints (all via Gateway on port 3000)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | No | Register, returns token pair |
| POST | `/auth/login` | No | Login, returns token pair |
| POST | `/auth/refresh` | No | Swap refresh token for new pair |
| GET | `/auth/google` | No | Initiate Google OAuth — `?redirect=<url>` (browser only) |
| GET | `/auth/google/callback` | No | OAuth callback — sets cookies, redirects to frontend |
| POST | `/content` | Cookie / Bearer | Create content item |
| GET | `/content` | Cookie / Bearer | List own content |
| GET | `/content/:id` | Cookie / Bearer | Get one content item |
| POST | `/links` | Cookie / Bearer | Create short link |
| GET | `/links` | Cookie / Bearer | List own short links with click counts |
| DELETE | `/links/:slug` | Cookie / Bearer | Delete a short link |
| GET | `/s/:slug` | No | Resolve short link (302 redirect) |
| GET | `/templates` | No | List all available email templates |
| GET | `/templates/:id/preview` | No | Render a template with preview data (returns HTML) |
| POST | `/notify/send` | Cookie / Bearer | Send an email via named template (proxied to notification service) |
| GET | `/health` | No | Gateway liveness — uptime + timestamp |
| GET | `/health/ready` | No | Gateway readiness — pings auth, content, url-shortener |

## Commands

```bash
# Docker (recommended)
docker compose up                        # start all services
docker compose build --no-cache          # rebuild images (after Dockerfile changes)
docker compose down                      # stop all services

# Database
npx prisma migrate dev                   # run migrations (first time / local)
npx prisma generate                      # regenerate client after schema changes

# Local dev (individual services)
pnpm run start:gateway                   # gateway on port 3000
pnpm run start:auth                      # auth-service on port 3001
pnpm run start:content                   # content-service on port 3002
pnpm run start:url-shortener             # url-shortener on port 3003
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

- Redis caching layer
- Job Worker Service — background queues
- RBAC permissions
- Multi-tenancy
