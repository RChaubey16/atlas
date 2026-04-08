# URL Shortener Service Design

**Date:** 2026-04-08
**Status:** Approved

---

## Overview

A standalone NestJS HTTP microservice (`apps/url-shortener/`) that allows authenticated users to create, list, and delete short links. Public redirect via slug is unauthenticated. Click events are tracked per redirect hit. Links expire after 30 days.

---

## Architecture & Data Flow

```
Client
  ↓
API Gateway (port 3000)
  ├── POST /links          → [JWT required] url-shortener:3003 — create short link
  ├── GET  /links          → [JWT required] url-shortener:3003 — list own links
  ├── DELETE /links/:slug  → [JWT required] url-shortener:3003 — delete own link
  └── GET  /s/:slug        → [PUBLIC]       url-shortener:3003 — redirect + count click
```

- Gateway adds a `UrlShortenerProxyModule` following the same `HttpService`-based proxy pattern used for content and dummy endpoints.
- `url-shortener` runs as a standalone HTTP service on port 3003.
- Authenticated routes pass the `Authorization` header through so the service can extract `userId` from the JWT.
- The public redirect (`/s/:slug`) bypasses the JWT guard on the gateway.

---

## File Structure

```
apps/url-shortener/
  src/
    main.ts                         # bootstrap HTTP app on port 3003
    app.module.ts                   # root module
    links/
      links.controller.ts           # POST /links, GET /links, DELETE /links/:slug
      links.controller.spec.ts
      links.service.ts              # create, list, delete, ownership validation
      links.service.spec.ts
      cleanup.service.ts            # @Cron nightly hard-delete of expired links
      links.module.ts
    redirect/
      redirect.controller.ts        # GET /s/:slug — public, 302 redirect + click event
      redirect.controller.spec.ts
      redirect.module.ts
    app.controller.ts               # GET / health check
    app.controller.spec.ts
    prisma/
      prisma.service.ts             # same PrismaService pattern as other services
  tsconfig.app.json
```

### Gateway additions

```
apps/gateway/src/
  url-shortener/
    url-shortener-proxy.service.ts
    url-shortener-proxy.service.spec.ts
    url-shortener-proxy.controller.ts
    url-shortener-proxy.controller.spec.ts
    url-shortener-proxy.module.ts
```

---

## Data Model

Added to `prisma/schema.prisma`:

```prisma
model ShortLink {
  id        String       @id @default(cuid())
  slug      String       @unique
  targetUrl String
  userId    String
  expiresAt DateTime
  createdAt DateTime     @default(now())
  clicks    ClickEvent[]
}

model ClickEvent {
  id          String    @id @default(cuid())
  shortLinkId String
  clickedAt   DateTime  @default(now())
  shortLink   ShortLink @relation(fields: [shortLinkId], references: [id], onDelete: Cascade)
}
```

---

## Component Details

### LinksService

- **Create:** accepts `targetUrl` and optional `customSlug`. If no slug provided, generates a 6-character base62 string via `nanoid`. Retries on collision (up to 5 attempts). Custom slugs are validated: alphanumeric + hyphens, 3–50 characters. `expiresAt` is always `now + 30 days`.
- **List:** returns all `ShortLink` rows for the authenticated `userId`, including `clickCount` as an aggregate of related `ClickEvent` rows.
- **Delete:** checks `userId` ownership before deleting. Returns `403` if the link belongs to another user.

### RedirectController

- `GET /s/:slug` — looks up the slug. Returns `410 Gone` if expired, `404 Not Found` if missing. On success: inserts a `ClickEvent` row and issues a `302` redirect to `targetUrl`.

### Cleanup Job

- A `@Cron('0 2 * * *')` task (runs nightly at 02:00) hard-deletes all `ShortLink` rows where `expiresAt < now`. `ClickEvent` rows are cascade-deleted.
- Lives in a dedicated `links/cleanup.service.ts` injected into `LinksModule`.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/links` | Bearer token | Create a short link |
| GET | `/links` | Bearer token | List own short links (with click counts) |
| DELETE | `/links/:slug` | Bearer token | Delete own short link |
| GET | `/s/:slug` | None | Redirect to target URL |

### POST /links — request body

```json
{
  "targetUrl": "https://example.com/very/long/path",
  "slug": "my-brand"   // optional — omit for auto-generated slug
}
```

### POST /links — response

```json
{
  "slug": "my-brand",
  "targetUrl": "https://example.com/very/long/path",
  "expiresAt": "2026-05-08T00:00:00.000Z",
  "createdAt": "2026-04-08T00:00:00.000Z",
  "clickCount": 0
}
```

### GET /links — response

```json
[
  {
    "slug": "xK3p9",
    "targetUrl": "https://example.com",
    "expiresAt": "2026-05-08T00:00:00.000Z",
    "createdAt": "2026-04-08T00:00:00.000Z",
    "clickCount": 42
  }
]
```

---

## Error Handling

| Scenario | HTTP Status | Message |
|----------|-------------|---------|
| Slug already taken (custom) | `409 Conflict` | "Slug already in use" |
| Slug not found on redirect | `404 Not Found` | "Short link not found" |
| Link expired on redirect | `410 Gone` | "Link has expired" |
| Delete another user's link | `403 Forbidden` | "Forbidden" |
| Invalid URL format | `400 Bad Request` | "targetUrl must be a valid URL" |
| Invalid custom slug format | `400 Bad Request` | "Slug must be 3–50 alphanumeric/hyphen characters" |

---

## Testing

All tests written before implementation (TDD), consistent with existing repo approach.

| File | Coverage |
|------|----------|
| `links.service.spec.ts` | create (auto-slug, custom slug, collision retry), list (own links only), delete (ownership check), clickCount aggregation |
| `links.controller.spec.ts` | request/response shapes, auth header extraction, DTO validation |
| `redirect.controller.spec.ts` | 302 redirect, 404 (not found), 410 (expired), click event insertion |
| `app.controller.spec.ts` | health check returns `{ status: 'ok' }` |
| `url-shortener-proxy.service.spec.ts` | gateway proxy forwards correctly |
| `url-shortener-proxy.controller.spec.ts` | gateway controller routes correctly |

No e2e tests — consistent with the rest of the repo.

---

## Infrastructure

### Docker Compose additions

```yaml
url-shortener:
  build: .
  container_name: atlas-url-shortener
  ports:
    - "3003:3003"
  volumes:
    - .:/app
    - /app/node_modules
  command: pnpm run start:url-shortener
  environment:
    URL_SHORTENER_PORT: 3003
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/atlas?schema=public
    JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
  depends_on:
    postgres:
      condition: service_healthy
```

Gateway gets `URL_SHORTENER_URL: http://url-shortener:3003` added to its environment block.

### New environment variables

```env
URL_SHORTENER_PORT=3003
URL_SHORTENER_URL="http://localhost:3003"
```

---

## Monorepo Registration

`nest-cli.json` gets a new `url-shortener` project entry (same shape as `auth-service` / `content-service`).

`package.json` gets new scripts:
- `start:url-shortener`
- `build:url-shortener`
