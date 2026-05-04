# Atlas

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

A production-style microservices backend built with NestJS. Demonstrates clean service boundaries, an API Gateway pattern, JWT authentication, Google OAuth, event-driven notifications, and URL shortening — all running in Docker.

---

## Overview

Atlas is split into five independent services, each with a single responsibility:

| Service | Port | Responsibility |
|---|---|---|
| **API Gateway** | `3000` | Single entry point — CORS, JWT guard, Google OAuth, proxies all routes |
| **Auth Service** | `3001` | Registration, login, refresh tokens, Google find-or-create |
| **Content Service** | `3002` | Creating and fetching content owned by a user |
| **URL Shortener** | `3003` | Short link creation, click tracking, nightly expiry cleanup |
| **Notification Service** | `3004` | Hybrid — RabbitMQ consumer (`user.created` → welcome email) + HTTP for on-demand sends |

All client traffic enters through the **Gateway only**. All other services are internal.

```
Client / Browser
       │
       ▼
  API Gateway  :3000
  ├──► Auth Service       :3001 ──► PostgreSQL
  ├──► Content Service    :3002 ──► PostgreSQL
  └──► URL Shortener      :3003 ──► PostgreSQL

  Auth Service ──[user.created]──► RabbitMQ ──► Notification Service ──► Resend API
```

---

## Tech Stack

| | |
|---|---|
| Framework | NestJS 11 (monorepo) |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma v7 + `@prisma/adapter-pg` |
| Authentication | JWT (access 15min + refresh 7d), bcrypt, Google OAuth 2.0 |
| Auth transport | `httpOnly` cookies (browser) + `Authorization` header (API clients) |
| Inter-service HTTP | `@nestjs/axios` |
| Message broker | RabbitMQ + `@nestjs/microservices` |
| Email | Resend SDK |
| Package manager | pnpm |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
atlas/
├── apps/
│   ├── gateway/               # API Gateway — port 3000
│   │   └── src/
│   │       ├── auth/          # JWT + Google strategies, guards, auth proxy
│   │       ├── content/       # Proxy to content-service (protected)
│   │       ├── url-shortener/ # Proxy to url-shortener (protected + public redirect)
│   │       └── dummy/         # Public hardcoded endpoints
│   │
│   ├── auth-service/          # Auth Service — port 3001
│   │   └── src/
│   │       ├── auth/          # Register, login, refresh, Google find-or-create, DTOs
│   │       └── prisma/        # PrismaService
│   │
│   ├── content-service/       # Content Service — port 3002
│   │   └── src/
│   │       ├── content/       # Create, list, fetch with ownership checks
│   │       └── prisma/        # PrismaService
│   │
│   ├── url-shortener/         # URL Shortener — port 3003
│   │   └── src/
│   │       ├── links/         # Create, list, delete short links + nightly cleanup cron
│   │       └── redirect/      # Public slug resolution + click tracking
│   │
│   └── notification-service/  # Port 3004 (HTTP) + RabbitMQ consumer
│       └── src/
│           ├── notification/  # Consumes user.created, delegates to EmailService
│           └── email/         # Resend SDK wrapper + welcome email template
│
├── libs/
│   └── contracts/             # Shared event types (imported as @app/contracts)
│
├── prisma/
│   └── schema.prisma          # User, Content, ShortLink, ClickEvent models
│
├── docs/
│   ├── notes.md               # Plain-English project overview
│   ├── nest-notes.md          # NestJS concepts explained with code examples
│   └── api-guide.md           # Full API reference with request/response examples
│
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.prod
└── .env.example
```

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js 20+](https://nodejs.org/) and [pnpm](https://pnpm.io/) (local dev only)

### 1. Clone the repository

```bash
git clone <repository-url>
cd atlas
```

### 2. Create the `.env` file

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Minimum required values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/atlas?schema=public"

JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

RABBITMQ_URL="amqp://guest:guest@localhost:5672"
RESEND_API_KEY="your-resend-key"
SMTP_FROM="Atlas <no-reply@yourdomain.com>"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

NODE_ENV="development"
ALLOWED_ORIGINS="http://localhost:5173"
FRONTEND_URL="http://localhost:5173"
```

Generate secure JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Google OAuth credentials: [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client. Add `http://localhost:3000/auth/google/callback` as an authorised redirect URI.

### 3. Start all services

```bash
docker compose up
```

Starts PostgreSQL, RabbitMQ, Gateway, Auth Service, Content Service, URL Shortener, and Notification Service. The first run builds the Docker images and runs database migrations automatically.

### 4. Test it

```bash
# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use the returned accessToken to create content
curl -X POST http://localhost:3000/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"title": "Hello World", "body": "My first post."}'

# Google OAuth — open in a browser
open http://localhost:3000/auth/google?redirect=http://localhost:5173
```

---

## API Reference

All requests go to the Gateway at `http://localhost:3000`. Interactive docs available at **`http://localhost:3000/docs`** (Swagger UI). See [`docs/api-guide.md`](./docs/api-guide.md) for full request/response examples.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Create account, returns token pair |
| `POST` | `/auth/login` | None | Login, returns token pair |
| `POST` | `/auth/refresh` | None | Exchange refresh token for new pair |
| `POST` | `/auth/logout` | None | Clear auth cookies |
| `GET` | `/auth/google` | None | Initiate Google OAuth (browser only) — pass `?redirect=<url>` |
| `GET` | `/auth/google/callback` | None | OAuth callback — sets cookies, redirects to frontend |

### Content

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/content` | Bearer / cookie | Create a content item |
| `GET` | `/content` | Bearer / cookie | List all your content |
| `GET` | `/content/:id` | Bearer / cookie | Fetch a single content item |

### URL Shortener

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/links` | Bearer / cookie | Create a short link (30-day expiry) |
| `GET` | `/links` | Bearer / cookie | List your short links with click counts |
| `GET` | `/links/:slug/analytics` | Bearer / cookie | Click analytics for a specific link |
| `PATCH` | `/links/:slug` | Bearer / cookie | Update a short link |
| `DELETE` | `/links/:slug` | Bearer / cookie | Delete a short link |
| `GET` | `/s/:slug` | None | Follow a short link (302 redirect) |

### Email Templates

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/templates` | None | List all available email templates |
| `GET` | `/templates/:id/preview` | None | Render a template with preview data (returns HTML) |
| `POST` | `/notify/send` | Bearer / cookie | Send an email via a named template |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Gateway liveness — uptime + timestamp |
| `GET` | `/health/ready` | None | Gateway readiness — pings all downstream services |

### Token behaviour

- **API clients (Postman, curl):** pass `Authorization: Bearer <accessToken>` on every protected request.
- **Browser clients:** after Google OAuth, `access_token` and `refresh_token` cookies are set on `.ruturaj.xyz` automatically. Pass `credentials: 'include'` on every `fetch` call.
- Access tokens expire after **15 minutes**. Use `/auth/refresh` to get a new pair.

---

## Database Schema

```
users
├── id            UUID (primary key)
├── email         String (unique)
├── password_hash String (nullable — Google-only accounts have no password)
├── google_id     String (nullable, unique — set for Google OAuth accounts)
└── created_at    DateTime

content
├── id        UUID (primary key)
├── title     String
├── body      String
├── owner_id  UUID (foreign key → users.id)
└── created_at DateTime

ShortLink
├── id         cuid (primary key)
├── slug       String (unique)
├── targetUrl  String
├── userId     String
├── expiresAt  DateTime
└── createdAt  DateTime

ClickEvent
├── id           cuid (primary key)
├── shortLinkId  String (foreign key → ShortLink.id, cascade delete)
└── clickedAt    DateTime
```

---

## Development

### Run services individually (without Docker)

```bash
docker compose up postgres rabbitmq   # infrastructure only

pnpm run start:gateway        # port 3000
pnpm run start:auth           # port 3001
pnpm run start:content        # port 3002
pnpm run start:url-shortener  # port 3003
pnpm run start:notification   # no port — connects to RabbitMQ
```

### Build for production

```bash
pnpm run build:gateway
pnpm run build:auth
pnpm run build:content
pnpm run build:notification
```

### Testing and linting

```bash
pnpm test
pnpm run test:cov
pnpm run lint
```

### Useful Docker commands

```bash
docker compose up --build         # rebuild images and start
docker compose up -d              # start in background
docker compose down               # stop all containers
docker compose logs auth-service  # view logs for a specific service
```

### After changing the Prisma schema

```bash
npx prisma migrate dev    # create and apply migration
npx prisma generate       # regenerate the TypeScript client
```

---

## Architecture Decisions

**Single shared image** — All services build from the same `Dockerfile`. The `command` in `docker-compose.yml` determines which app starts. Keeps the build simple for a monorepo while isolating services at runtime.

**Google OAuth at the gateway** — The `GoogleStrategy` (Passport) and Google credentials live in the gateway, not the auth-service. The gateway owns the external OAuth flow; the auth-service owns user identity. After Google confirms the profile, the gateway calls `POST /auth/google-profile` internally to find or create the user and issue a JWT pair.

**Cookie-based tokens for browsers** — After Google OAuth, tokens are set as `httpOnly` cookies scoped to `.ruturaj.xyz`. This means any subdomain frontend (`links.ruturaj.xyz`, etc.) shares the same session without any token management in JavaScript. API clients (Postman, curl) continue using the `Authorization` header — the JWT strategy accepts both.

**`?redirect=` in OAuth state** — Frontends pass their origin via `?redirect=` when initiating Google login. The gateway stores this in the OAuth `state` parameter (round-tripped by Google) and redirects the browser there after setting cookies. No server-side session needed.

**CORS with `credentials: true`** — Required for browsers to send cookies cross-origin. The `ALLOWED_ORIGINS` env var controls which subdomains are permitted. In production this is set to the specific frontend origins.

**HTTP between services** — The gateway uses `@nestjs/axios` to forward requests over HTTP. Simple, independently testable with any HTTP client.

**User identity via header** — The gateway validates the JWT, extracts `userId`, and forwards it to downstream services as `x-user-id`. Services trust this header because they are not publicly reachable.

**Event-driven notifications** — The auth-service publishes `user.created` to RabbitMQ after registration (and after Google sign-up for new accounts). The notification-service consumes it and sends a welcome email. The HTTP response is not delayed.

**Prisma v7 adapter pattern** — `url` is no longer in `schema.prisma`. The connection string is passed via the `PrismaPg` driver adapter in `PrismaService`. `prisma generate` runs in the Dockerfile before TypeScript compilation.

---

## Documentation

| File | Contents |
|---|---|
| [`docs/notes.md`](./docs/notes.md) | Plain-English explanation of the project and each service |
| [`docs/nest-notes.md`](./docs/nest-notes.md) | NestJS concepts used in this project, explained from scratch |
| [`docs/api-guide.md`](./docs/api-guide.md) | Full API reference — every endpoint with examples for both Postman and browser |

---

## Roadmap

- [ ] Redis caching — cache frequently read content
- [ ] Job Worker Service — background task processing with queues
- [ ] RBAC — role-based access control (admin, editor, viewer)
- [ ] Multi-tenancy support
