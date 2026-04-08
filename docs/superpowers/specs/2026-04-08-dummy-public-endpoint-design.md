# Dummy Public Endpoint — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Overview

Add two public (no-auth) endpoints to the Atlas API that return hardcoded dummy data — blogs and fake users. The purpose is to give anyone a quick API to connect to and test against without needing to register or log in.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/dummy/blogs` | None | Returns 5 hardcoded blog entries |
| GET | `/dummy/users` | None | Returns 5 hardcoded fake user entries |

## Architecture

```
Client
  → GET /dummy/blogs   (no auth header needed)
  → GET /dummy/users

Gateway (port 3000)
  DummyProxyController  ← no JwtAuthGuard
    → proxies to content service via HttpService

Content Service (port 3002)
  DummyController
    GET /dummy/blogs  → DummyService.getBlogs()
    GET /dummy/users  → DummyService.getUsers()

DummyService
  → returns hardcoded arrays (no Prisma, no DB)
```

## Response Shapes

### GET /dummy/blogs

```json
[
  {
    "id": "1",
    "title": "Getting Started with NestJS",
    "body": "NestJS is a progressive Node.js framework...",
    "author": "Jane Doe",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
]
```

~5 entries returned.

### GET /dummy/users

```json
[
  {
    "id": "1",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "avatarUrl": "https://i.pravatar.cc/150?img=1"
  }
]
```

~5 entries returned.

## New Files

### Content Service

- `apps/content-service/src/dummy/dummy.service.ts` — hardcoded data, no Prisma
- `apps/content-service/src/dummy/dummy.controller.ts` — `@Controller('dummy')`, no auth
- `apps/content-service/src/dummy/dummy.module.ts` — registers controller and service

### Gateway

- `apps/gateway/src/dummy/dummy-proxy.service.ts` — proxies to content service via HttpService
- `apps/gateway/src/dummy/dummy-proxy.controller.ts` — `@Controller('dummy')`, no `@UseGuards`
- `apps/gateway/src/dummy/dummy.module.ts` — registers controller and service

Both modules are registered in their respective `AppModule`.

## Key Decisions

- **No JwtAuthGuard** on gateway dummy routes — completely public by design.
- **No `x-user-id` header** forwarded — dummy data has no ownership concept.
- **Hardcoded data** in `DummyService` — no DB, no Faker, same response every time.
- **Separate `/dummy` prefix** — keeps public and protected routes cleanly separated; no guard workarounds needed.
- **Error handling** — if content service is down, gateway propagates the error as-is (consistent with existing proxy behavior).

## Out of Scope

- Dynamic/random data generation (Faker.js)
- Pagination
- Filtering or query params
- Persisting dummy data to DB
