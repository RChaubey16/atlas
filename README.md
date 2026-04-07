# Atlas

A production-style microservices backend built with NestJS. Demonstrates clean service boundaries, an API Gateway pattern, JWT authentication, and a shared contracts library — all running in Docker.

---

## Overview

Atlas is split into three independent services, each with a single responsibility:

| Service | Port | Responsibility |
|---|---|---|
| **API Gateway** | `3000` | Single entry point — routes requests, validates JWT tokens |
| **Auth Service** | `3001` | User registration, login, and token management |
| **Content Service** | `3002` | Creating and fetching content owned by a user |

All client traffic enters through the **Gateway only**. The other services are internal and never exposed directly.

```
Client
  │
  ▼
API Gateway  :3000
  ├──► Auth Service     :3001 ──► PostgreSQL
  └──► Content Service  :3002 ──► PostgreSQL
```

---

## Tech Stack

| | |
|---|---|
| Framework | NestJS 11 (monorepo) |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma v7 |
| Authentication | JWT (access + refresh tokens) |
| Password hashing | bcrypt |
| Inter-service communication | HTTP via `@nestjs/axios` |
| Package manager | pnpm |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
atlas/
├── apps/
│   ├── gateway/               # API Gateway — port 3000
│   │   └── src/
│   │       ├── auth/          # JWT strategy, guard, proxy to auth-service
│   │       └── content/       # Proxy to content-service (protected routes)
│   │
│   ├── auth-service/          # Auth Service — port 3001
│   │   └── src/
│   │       ├── auth/          # Register, login, refresh, DTOs, JWT strategy
│   │       └── prisma/        # PrismaService (database connection)
│   │
│   └── content-service/       # Content Service — port 3002
│       └── src/
│           ├── content/       # Create, list, fetch content with ownership checks
│           └── prisma/        # PrismaService (database connection)
│
├── libs/
│   └── contracts/             # Shared event types (imported as @app/contracts)
│       └── src/
│           └── events/
│               └── user-created.event.ts
│
├── prisma/
│   └── schema.prisma          # User and Content database models
│
├── docker-compose.yml         # All 4 services wired together
├── Dockerfile                 # Dev image (used by docker-compose)
├── Dockerfile.prod            # Multi-stage production image
├── nest-cli.json              # NestJS monorepo configuration
└── .env                       # Local environment variables (not committed)
```

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js 20+](https://nodejs.org/) and [pnpm](https://pnpm.io/) (for local dev only)

### 1. Clone the repository

```bash
git clone <repository-url>
cd atlas
```

### 2. Create the `.env` file

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/atlas?schema=public"

JWT_ACCESS_SECRET="your-access-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"

GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
CONTENT_SERVICE_PORT=3002

AUTH_SERVICE_URL="http://localhost:3001"
CONTENT_SERVICE_URL="http://localhost:3002"
```

Generate secure secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start all services

```bash
docker compose up
```

This starts PostgreSQL, the Gateway, Auth Service, and Content Service. The first run will build the Docker images.

### 4. Run database migrations

In a separate terminal (while containers are running):

```bash
npx prisma migrate dev
```

### 5. Test it

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
```

---

## API Reference

All requests go to the Gateway at `http://localhost:3000`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Create account, returns token pair |
| `POST` | `/auth/login` | None | Login, returns token pair |
| `POST` | `/auth/refresh` | None | Exchange refresh token for new pair |

### Content

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/content` | Bearer token | Create a content item |
| `GET` | `/content` | Bearer token | List all your content |
| `GET` | `/content/:id` | Bearer token | Fetch a single content item |

**Add the token to protected requests:**
```
Authorization: Bearer <accessToken>
```

**Access tokens** expire after 15 minutes. Use the `/auth/refresh` endpoint with your `refreshToken` to get a new pair without logging in again. Refresh tokens are valid for 7 days.

For full request/response examples see [`api-guide.md`](./api-guide.md).

---

## Database Schema

```
users
├── id           UUID (primary key)
├── email        String (unique)
├── password_hash String
└── created_at   DateTime

content
├── id           UUID (primary key)
├── title        String
├── body         String
├── owner_id     UUID (foreign key → users.id)
└── created_at   DateTime
```

---

## Development

### Run services individually (without Docker)

Start PostgreSQL separately (or use Docker just for Postgres):

```bash
docker compose up postgres
```

Then run each service in its own terminal:

```bash
pnpm run start:gateway    # port 3000
pnpm run start:auth       # port 3001
pnpm run start:content    # port 3002
```

### Build for production

```bash
pnpm run build:gateway
pnpm run build:auth
pnpm run build:content
```

Or build all with the production Dockerfile:

```bash
docker build -f Dockerfile.prod -t atlas .
```

### Testing

```bash
pnpm test           # unit tests
pnpm run test:cov   # with coverage report
```

### Linting

```bash
pnpm run lint
```

### Useful Docker commands

```bash
docker compose up --build        # rebuild images and start
docker compose up -d             # start in background
docker compose down              # stop all containers
docker compose logs auth-service # view logs for a specific service
```

### After changing the Prisma schema

```bash
npx prisma migrate dev    # create and apply migration
npx prisma generate       # regenerate the TypeScript client
```

---

## Architecture Decisions

**Single shared image** — All three services build from the same `Dockerfile`. The `command` in `docker-compose.yml` determines which app starts. This simplifies the build process for a monorepo while keeping services isolated at runtime.

**HTTP between services** — The Gateway uses `@nestjs/axios` to forward requests to services over HTTP. This is the simplest approach for an MVP and makes each service independently testable with a regular HTTP client.

**User identity via header** — Once the Gateway validates a JWT, it extracts the `userId` and forwards it to the Content Service as the `x-user-id` header. The Content Service trusts this header because it is only reachable internally (not exposed to the public).

**Prisma v7 adapter pattern** — Prisma v7 removed the `url` field from `schema.prisma`. The database connection URL is now passed via the `PrismaPg` driver adapter directly in `PrismaService`. This is reflected in both `PrismaService` files and the `Dockerfile` (which runs `prisma generate` at build time).

**Shared contracts library** — `libs/contracts` defines the shape of internal events (e.g. `UserCreatedEvent`). Services import from `@app/contracts`. This keeps future integrations (message brokers, notification services) decoupled from the start.

---

## Documentation

| File | Contents |
|---|---|
| [`notes.md`](./notes.md) | Plain-English explanation of the project and each service |
| [`nest-notes.md`](./nest-notes.md) | NestJS concepts used in this project, explained from scratch |
| [`api-guide.md`](./api-guide.md) | Postman guide — every endpoint with request bodies and responses |
| [`plan/Phase-1.md`](./plan/Phase-1.md) | Original MVP plan and architecture spec |

---

## Roadmap

- [ ] Notification Service — listens for `user.created` events, sends welcome emails
- [ ] Redis caching — cache frequently read content
- [ ] Job Worker Service — background task processing with queues
- [ ] RBAC — role-based access control (admin, editor, viewer)
- [ ] Multi-tenancy support
