# Atlas — Project Context for Claude Code

## What This Project Is

**Atlas** is a NestJS microservices backend portfolio project. The goal is to build a minimal but architecturally sound microservices system demonstrating service boundaries, an API Gateway pattern, event contracts, and clean NestJS modular design.

## Current State (as of 2026-04-07)

- Basic NestJS app scaffolded (single-app mode, not yet monorepo)
- Dockerized: `Dockerfile` (dev), `Dockerfile.prod` (multi-stage production build)
- `docker-compose.yml` runs the app in dev mode on port 3000
- Package manager: **pnpm**
- Node version: 20 (alpine in Docker)
- No services, no database, no auth implemented yet

## Planned Architecture (Phase 1 MVP)

```
Client → API Gateway → Services

apps/
 ├── gateway/          # Single entry point, JWT validation, routing
 ├── auth-service/     # Registration, login, JWT issuance, refresh tokens
 └── content-service/  # Posts/tasks/articles, ownership validation

libs/
 ├── contracts/        # Shared event types and interfaces
 └── common/           # Shared utilities
```

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | NestJS (monorepo mode) |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens) |
| Package Manager | pnpm |
| Containerization | Docker Compose |
| Caching (future) | Redis |

## MVP Features to Build

### Auth Service
- User registration
- Login with password hashing
- JWT access token issuance
- Refresh tokens
- Emit `user.created` domain event

### Content Service
- Create content item
- Fetch user content
- Ownership validation
- Authenticated access only

### API Gateway
- Route requests to services
- Validate JWT tokens
- Apply guards/middleware
- Centralized API surface

## Database Schema (Minimal)

**Users**: `id (uuid)`, `email`, `password_hash`, `created_at`

**Content**: `id (uuid)`, `title`, `body`, `owner_id`, `created_at`

## Event Contracts

Defined in `libs/contracts/events/`:

```ts
export const USER_CREATED_EVENT = 'user.created';

export interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}
```

## Development Order (from plan)

1. Convert to NestJS monorepo
2. Setup shared `contracts` library
3. Implement Auth Service
4. Add JWT authentication
5. Build API Gateway
6. Connect Gateway → Auth Service
7. Implement Content Service
8. Protect content routes
9. Complete Docker Compose setup (gateway, auth-service, content-service, postgres)

## MVP Success Criteria

- User registers through Gateway
- User logs in and receives JWT
- Authenticated user creates content
- Content is tied to correct user
- All services run via Docker Compose

## Future Extensions (Post-MVP)

- Notification Service (event listener)
- Job Worker Service (queues)
- Redis caching layer
- Analytics service
- RBAC permissions
- Multi-tenancy

## Key Files

| File | Purpose |
|---|---|
| `plan/Phase-1.md` | Full MVP plan and architecture spec |
| `docker-compose.yml` | Docker service definitions |
| `Dockerfile` | Dev image |
| `Dockerfile.prod` | Multi-stage production image |
| `src/main.ts` | App entry point (port 3000) |

## Commands

```bash
pnpm install          # Install dependencies
pnpm run start:dev    # Dev server with watch mode
pnpm run build        # Build
pnpm run test         # Unit tests
pnpm run test:e2e     # E2E tests
pnpm run lint         # Lint + fix
```
