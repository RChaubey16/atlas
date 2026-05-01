# Atlas — Portfolio & Production Readiness Checklist

Current state: **functionally complete**. These items harden the project for real use and make it credible as a portfolio piece that demonstrates production thinking.

---

## HIGH PRIORITY

### 1. CI/CD Pipeline (GitHub Actions)
- [x] `lint.yml` — run ESLint on every PR and push to main
- [x] `test.yml` — run unit tests + e2e tests, publish coverage report
- [x] `build.yml` — build all Docker images to verify no compile errors

Nothing signals "production-ready" to a reviewer faster than a passing CI badge on the README.

#### What was done
Three workflows created under `.github/workflows/`:

- **`lint.yml`** — triggers on push/PR to `main`; installs deps with `pnpm install --frozen-lockfile`, runs `eslint "{apps,libs}/**/*.ts" --max-warnings 0`. Uses `--max-warnings 0` (not `--fix`) so any lint error fails the pipeline.
- **`test.yml`** — triggers on push/PR to `main`; runs `prisma generate` first (required because `@prisma/client` types are generated, not committed), then `pnpm test:cov` for unit tests with coverage. Uploads the `coverage/` folder as a build artifact (7-day retention).
- **`build.yml`** — triggers on push/PR to `main`; runs `prisma generate`, then compiles all five apps in order: `gateway → auth-service → content-service → url-shortener → notification-service`. Catches TypeScript errors without needing Docker.

All three use `pnpm/action-setup@v4` (detects pnpm v10 from `packageManager` in `package.json`) and `actions/setup-node@v4` with `cache: pnpm` for fast installs.

---

### 2. Environment Variable Validation
- [x] Add `@nestjs/config` + Joi validation schema to each service's `AppModule`
- [x] Fail fast at startup if required vars (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RABBITMQ_URL`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) are missing or malformed
- [x] Remove all `?? ''` silent defaults in strategies/services (e.g., `process.env.JWT_ACCESS_SECRET ?? ''`)

Currently the app silently uses empty strings when secrets are missing — this causes confusing runtime failures instead of a clear startup error.

#### What was done
Installed `@nestjs/config@4.0.4` and `joi@18.1.2`.

Added `ConfigModule.forRoot({ isGlobal: true, validationSchema: Joi.object({...}) })` to each service's root module. Each schema is scoped to the vars that service actually needs:

| Service | Required vars validated |
|---|---|
| `gateway` | `JWT_ACCESS_SECRET`, `AUTH_SERVICE_URL`, `CONTENT_SERVICE_URL`, `URL_SHORTENER_URL`, `NOTIFICATION_SERVICE_URL`, `INTERNAL_NOTIFICATION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| `auth-service` | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` |
| `content-service` | `DATABASE_URL` |
| `url-shortener` | `DATABASE_URL` |
| `notification-service` | `RESEND_API_KEY`, `INTERNAL_NOTIFICATION_KEY` |

`isGlobal: true` means `ConfigService` is injectable anywhere in the service without re-importing `ConfigModule` in feature modules.

Updated Passport strategies, guards, and services to inject `ConfigService` instead of reading `process.env` directly:
- `apps/gateway/src/auth/jwt.strategy.ts` — `configService.getOrThrow('JWT_ACCESS_SECRET')`
- `apps/gateway/src/auth/strategies/google.strategy.ts` — `getOrThrow` for client ID/secret, `get` with fallback for callback URL
- `apps/auth-service/src/auth/strategies/jwt.strategy.ts` — `configService.getOrThrow('JWT_ACCESS_SECRET')`
- `apps/auth-service/src/auth/auth.service.ts` — JWT secrets stored as `private readonly` fields, set from `ConfigService` in constructor; eliminated `process.env.JWT_ACCESS_SECRET` / `process.env.JWT_REFRESH_SECRET` from `issueTokens()` and `refresh()`
- `apps/notification-service/src/email/email.service.ts` — constructor injection; `Resend` instance and `from` address now read from `ConfigService`
- `apps/notification-service/src/guards/internal-key.guard.ts` — `ConfigService` injected; `INTERNAL_NOTIFICATION_KEY` read via `getOrThrow` in constructor (eliminates runtime `process.env` check per request)
- `apps/gateway/src/notification/notification-proxy.service.ts` — `ConfigService` injected; `INTERNAL_NOTIFICATION_KEY` uses `getOrThrow` (was `?? ''` silent empty-string default)

**Round 2 (after code pull from second PC):** New code added `NotificationModule` to the gateway and introduced `TemplateRegistry`, `InternalKeyGuard`, and a hybrid HTTP+RMQ notification service. Updated schemas and DI for all new additions. Fixed three stale tests broken by the new dependencies (`email.service.spec.ts`, `auth.service.spec.ts`, `notification.service.spec.ts`). All 59 unit tests pass.

---

### 3. Structured Logging
- [ ] Add `NestJS Logger` consistently to **all** services (gateway, auth-service, content-service, url-shortener)
- [ ] Log HTTP requests at gateway level (method, path, status, latency)
- [ ] Log auth events: successful login, failed login, token refresh, registration
- [ ] Log proxy errors with upstream status and service name
- [ ] Replace all `console.log` with Logger

Gateway currently has zero request logging. For a portfolio piece, reviewers expect to see logging as a first-class concern.

---

### 4. Rate Limiting
- [ ] Install `@nestjs/throttler`
- [ ] Apply strict throttle on `POST /auth/login` and `POST /auth/register` (e.g., 5 requests / 60s per IP)
- [ ] Apply looser throttle on content/link creation (e.g., 20 requests / 60s per user)
- [ ] Add global fallback throttler in gateway

Without rate limiting, the auth endpoints are trivially brute-forceable.

---

### 5. Security Headers (Helmet)
- [ ] Install and configure `helmet` in gateway `main.ts`
- [ ] Set `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`
- [ ] Add request body size limit (e.g., `100kb`) via Express `bodyParser` or NestJS config
- [ ] Consider `express-mongo-sanitize` equivalent for Prisma input (Prisma handles SQL injection, but log this as a conscious decision)

---

### 6. Health Check Endpoints
- [ ] Add `GET /health` to gateway (returns `{ status, uptime, timestamp }`)
- [ ] Add `GET /health/ready` to gateway that checks downstream services (auth, content, url-shortener) and postgres reachability
- [ ] Add `GET /health` to each individual service (auth, content, url-shortener)
- [ ] Add healthcheck configs for app services in `docker-compose.yml` (currently only postgres and rabbitmq have them)

Needed for Kubernetes/cloud deployments and demonstrates operational awareness.

---

### 7. E2E Test Coverage
- [ ] Write e2e tests for the full auth flow: register → login → access protected route → refresh → access again
- [ ] E2E test for Google OAuth callback (can mock the strategy)
- [ ] E2E test for content CRUD with ownership check (user A cannot delete user B's content)
- [ ] E2E test for URL shortener: create → resolve redirect → delete
- [ ] E2E test for duplicate email registration returning 409 (not 500)
- [ ] Use a separate test database or transaction rollback to keep tests isolated

The current e2e suite has one test: `GET /` returns "Hello World!". That's not enough.

---

## MEDIUM PRIORITY

### 8. Refresh Token Rotation + Logout Blacklist
- [ ] On `POST /auth/refresh`, issue a **new** refresh token and invalidate the old one (store issued tokens or a jti blocklist in Redis/Postgres)
- [ ] Implement `POST /auth/logout` that blacklists the current refresh token
- [ ] On login, optionally invalidate all previous refresh tokens for that user (single-session mode)

Currently the same refresh token is valid for 7 days and cannot be revoked — a security gap worth addressing for a portfolio project.

---

### 9. Password Reset Flow
- [ ] `POST /auth/forgot-password` — generates a time-limited reset token, sends email via Resend
- [ ] `POST /auth/reset-password` — validates token, updates password hash, invalidates token

This is a standard expected feature; its absence is noticeable.

---

### 10. Email Verification
- [ ] On registration, send verification email with a signed link
- [ ] Add `emailVerified: boolean` to User model in Prisma schema
- [ ] Block login (or restrict access) until email is verified

Completes the auth system story. Demonstrates RabbitMQ/Resend integration is being used for more than one event.

---

### 11. Docker Compose Hardening
- [ ] Add `restart: unless-stopped` to all app services
- [ ] Add healthcheck configs for gateway, auth-service, content-service, url-shortener
- [ ] Add `depends_on: postgres: condition: service_healthy` to content-service and url-shortener (currently missing)
- [ ] Pin the Node.js Docker image to a specific digest or at least patch version (e.g., `node:20.18-alpine` not `node:20-alpine`)
- [ ] Set `NODE_ENV=production` in Dockerfile.prod

---

### 12. Global Exception Filter
- [ ] Create a `GlobalExceptionFilter` in gateway that shapes all error responses consistently:
  ```json
  {
    "statusCode": 404,
    "error": "Not Found",
    "message": "Short link not found",
    "requestId": "abc-123",
    "timestamp": "2026-05-01T10:00:00Z"
  }
  ```
- [ ] Add a `requestId` header (via interceptor) that flows through to error responses for traceability

---

### 13. Input Sanitization & Payload Limits
- [ ] Add max length constraints to `CreateContentDto` (`title`: 200 chars, `body`: 50,000 chars)
- [ ] Strip/escape HTML from content body if it's displayed on a frontend
- [ ] Block SSRF in `CreateLinkDto` — reject URLs that resolve to private IP ranges (127.x, 10.x, 192.168.x)

---

## LOW PRIORITY / POLISH

### 14. README Improvements
- [ ] Add a "Troubleshooting" section (common setup errors: missing `.env`, port conflicts, RabbitMQ not starting)
- [ ] Add a CI status badge at the top once GitHub Actions is set up
- [ ] Add a "License" section (MIT is fine)
- [ ] Expand the Roadmap section with the items from this list

---

### 15. Swagger Enhancements
- [ ] Document error response shapes (400/401/403/409/500) with `@ApiResponse` on all endpoints
- [ ] Add response examples for list endpoints (`GET /content`, `GET /links`)
- [ ] Document cookie-based auth flow separately from Bearer auth in the Swagger UI description
- [ ] Add server entries for local vs. production URLs

---

### 16. Strict TypeScript Config
- [ ] Enable `"strict": true` in `tsconfig.json` (or at minimum `"strictNullChecks": true`)
- [ ] Fix any resulting type errors — this will catch the `?? ''` env var patterns and null-unsafe code

---

### 17. Service-to-Service Auth (Optional but Impressive)
- [ ] Add a shared secret or service token that gateway must present when calling auth/content/url-shortener
- [ ] Currently any process that can reach port 3001 can call auth-service directly, bypassing the gateway

---

## WHAT'S ALREADY SOLID

These don't need changes — they're portfolio strengths:

- NestJS monorepo architecture with clean service boundaries
- JWT access + refresh token pair with httpOnly cookies (browser) and Bearer (API clients)
- Google OAuth 2.0 via Passport with state parameter forwarding
- RabbitMQ event-driven notification system
- Prisma v7 with driver adapter — modern ORM usage
- Content ownership validation
- URL shortener with click tracking, expiry, and nightly cleanup cron
- Comprehensive documentation (`docs/notes.md`, `docs/nest-notes.md`, `docs/api-guide.md`)
- Docker Compose setup that works out-of-the-box with 7 services
- Swagger on gateway with DTOs annotated

---

## SUGGESTED ORDER OF WORK

1. CI/CD Pipeline — unlocks automated verification for everything else
2. Environment validation — low effort, high safety signal
3. Helmet + rate limiting — security basics, quick wins
4. Structured logging — demonstrates production mindset
5. Health checks — needed for any real deployment
6. E2E tests — the biggest time investment, but most impressive
7. Refresh token rotation + logout — closes the auth security story
8. Password reset + email verification — completes the auth feature set
9. Global exception filter — polish
10. README + Swagger polish — last, so it reflects the finished state
