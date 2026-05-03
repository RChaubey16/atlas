# Atlas — Project Notes

## What Is This Project?

Atlas is a backend system built to demonstrate how real-world applications are structured at scale. Instead of one big program that does everything, Atlas is split into several smaller, focused programs called **microservices** — each responsible for one specific job.

Think of it like a restaurant:
- There is a **front desk** (the Gateway) that greets every customer and directs them to the right place.
- There is a **staff office** (the Auth Service) that checks IDs and issues visitor passes.
- There is a **kitchen** (the Content Service) that handles the actual food — in this case, content like posts or articles.
- There is a **shortcut desk** (the URL Shortener Service) that hands out short cards that redirect people to longer destinations, and tracks how often each card is used.

The front desk never makes food, and the kitchen never checks IDs. Each part does one thing well.

---

## The Big Picture

```
You (the user / app)
        |
        ▼
  [ API Gateway ]        ← The only door into the system (port 3000)
        |
   ┌────┼────────────────┬──────────────────┐
   ▼    ▼                ▼                  ▼
[Auth  [Content     [URL Shortener    [Notification
Svc]    Service]      Service]          Service]
   |        |              |                |
   └────────┴──────────────┘           PostgreSQL
                 ▼                     Resend API
           [ PostgreSQL ]  ← The database where everything is saved

[Auth Service] --[user.created event]--> [ RabbitMQ ] --> [ Notification Service ]
[API Gateway]  --[POST /notify/send  ]--> [ Notification Service ] (internal HTTP, x-internal-key)
[API Gateway]  --[/user-templates    ]--> [ Notification Service ] (CRUD, internal HTTP, x-internal-key)
[API Gateway]  --[GET  /templates    ]--> reads from libs/contracts (no downstream service call)
```

Every request from the outside world goes through the **Gateway first**. The Gateway decides where to send it and, for protected routes, checks that the user has a valid pass (JWT token) before letting them through.

When a user registers, the Auth Service publishes a `user.created` event to **RabbitMQ**. The Notification Service receives that event and sends a welcome email — completely decoupled from the HTTP request.

The Gateway also exposes `POST /notify/send` (JWT-protected), which proxies to the Notification Service's internal HTTP endpoint. This lets any authenticated caller send a templated email directly, without publishing a RabbitMQ event.

The Gateway serves `GET /templates` and `GET /templates/:id/preview` with no auth required. These endpoints read directly from the shared `libs/contracts` template registry — no downstream service call is made. A frontend can use them to display what templates are available and render a visual preview of each one.

Short link management routes (`/links/*`) are guarded by the same JWT check. The public redirect route (`/s/:slug`) intentionally bypasses the guard — anyone can follow a short link without an account.

---

## The Services

### 1. API Gateway (`apps/gateway/`) — Port 3000

**The front door of the entire system.**

Every API call from a client (mobile app, browser, etc.) hits the Gateway first. It does two things:

- **Routes requests** — forwards `/auth/...` calls to the Auth Service and `/content/...` calls to the Content Service. Also serves `/dummy/...` routes publicly without any auth check.
- **Checks identity** — for content routes, it verifies the user's JWT token before forwarding. If the token is missing or fake, the request is rejected here and never reaches the other services. Dummy and auth routes are intentionally exempt.
- **Supports two auth transports** — the JWT strategy reads the `access_token` cookie first (set by Google OAuth or future login-with-cookies flows), then falls back to the `Authorization: Bearer <token>` header. Both work transparently on every protected route; callers do not need to know which one the server used.
- **Logs all HTTP traffic** — a global `HttpLoggingInterceptor` logs every inbound request as `METHOD /path STATUS +Xms`, giving visibility into latency and error rates without adding any per-controller code.
- **Rate-limits sensitive routes** — a global `ThrottlerGuard` enforces a 100 req/60 s ceiling on all routes. Login and register are tightened to 5 req/60 s per IP; content and link creation are limited to 20 req/60 s per authenticated user ID. Callers that exceed the limit receive `429 Too Many Requests`.
- **Owns the Google OAuth flow** — the Gateway holds the `GoogleStrategy` (Passport) and the Google client credentials. It initiates the redirect to Google and handles the callback. After Google confirms identity, it sets `access_token` and `refresh_token` as `httpOnly` cookies (browser clients) and redirects to the configured frontend URL. Token pair JSON is also available for API clients.
- **Health and readiness** — `GET /health` returns a liveness response (uptime, timestamp) with no external checks. `GET /health/ready` uses `@nestjs/terminus` to ping all three downstream services and returns a detailed status object.
- **Swagger UI** — `GET /docs` serves an interactive OpenAPI explorer covering every route, request body shape, and expected response — no separate API reference needed for quick exploration.

The Gateway does not have its own database. It is purely a traffic director.

Key files:
- `apps/gateway/src/auth/jwt.strategy.ts` — JWT strategy; extracts token from `access_token` cookie first, then falls back to `Authorization: Bearer` header
- `apps/gateway/src/auth/jwt-auth.guard.ts` — the actual "bouncer" that blocks unauthenticated requests
- `apps/gateway/src/auth/auth-proxy.controller.ts` — handles login, register, refresh, logout (clears cookies), and Google OAuth endpoints
- `apps/gateway/src/auth/strategies/google.strategy.ts` — Passport Google OAuth 2.0 strategy; extracts `googleId`, `email`, and `name` from the Google profile
- `apps/gateway/src/auth/guards/google-auth.guard.ts` — triggers the Google redirect on `GET /auth/google` and validates the callback on `GET /auth/google/callback`
- `apps/gateway/src/auth/auth-proxy.service.ts` — forwards login/register/Google-profile calls to the Auth Service
- `apps/gateway/src/content/content-proxy.service.ts` — forwards content calls to the Content Service, passing the verified user ID along
- `apps/gateway/src/dummy/dummy-proxy.controller.ts` — serves `/dummy/blogs` and `/dummy/users` with no guard (fully public)
- `apps/gateway/src/url-shortener/url-shortener-proxy.service.ts` — forwards `/links/*` calls to the URL Shortener Service and handles slug resolution for redirects
- `apps/gateway/src/url-shortener/url-shortener-proxy.controller.ts` — guarded by `JwtAuthGuard`; passes `userId` from the token down to the URL Shortener
- `apps/gateway/src/url-shortener/url-shortener-redirect.controller.ts` — handles `GET /s/:slug` with no guard; issues a 302 redirect to the client
- `apps/gateway/src/templates/templates.controller.ts` — handles `GET /templates` (list) and `GET /templates/:id/preview` (rendered HTML); public, no guard; reads directly from `libs/contracts`
- `apps/gateway/src/user-templates/user-templates-proxy.controller.ts` — JWT-protected CRUD for `/user-templates`; proxies to Notification Service with `x-internal-key` and `x-user-id` headers
- `apps/gateway/src/user-templates/user-templates-proxy.service.ts` — forwards create/list/get/delete calls to `http://notification-service:3004/user-templates`
- `apps/gateway/src/health/health.controller.ts` — `GET /health` (liveness) and `GET /health/ready` (readiness; pings auth, content, and url-shortener services)
- `apps/gateway/src/common/http-logging.interceptor.ts` — global interceptor registered in `main.ts`; logs every inbound request with method, path, status code, and latency
- `apps/gateway/src/common/user-throttler.guard.ts` — custom `ThrottlerGuard` subclass; uses `userId` as the throttle key for authenticated routes and falls back to IP for public routes

---

### 2. Auth Service (`apps/auth-service/`) — Port 3001

**Handles everything to do with identity: who you are and proving it.**

This service never talks to the outside world directly — only the Gateway calls it. It owns the `users` table in the database.

What it does:

- **Register** — takes an email and password, saves the user (password is hashed and never stored in plain text), and returns two tokens.
- **Login** — checks the email and password, and if correct, returns two tokens.
- **Refresh** — when your short-lived access token expires, you can swap your refresh token for a new pair without logging in again.
- **Google profile** — internal endpoint called by the Gateway after a successful Google OAuth callback. Finds an existing user by `googleId`, links a `googleId` to an existing email/password account if the email matches, or creates a brand-new user. Always returns a JWT pair.
- **Health check** — `GET /health` queries the database via a Prisma health indicator; used by the Gateway's readiness probe.

**What is a JWT token?**
Think of it as a digitally signed visitor badge. It contains your user ID and email, and it proves you are who you say you are without the server needing to look you up in the database every time. It has an expiry — access tokens last 15 minutes, refresh tokens last 7 days.

Key files:
- `apps/auth-service/src/auth/auth.service.ts` — the core logic: register, login, refresh, Google find-or-create, and issue tokens
- `apps/auth-service/src/auth/dto/register.dto.ts` — defines what a valid registration request looks like (email + password of at least 8 characters)
- `apps/auth-service/src/auth/dto/google-profile.dto.ts` — shape of the Google profile sent from the Gateway (`googleId`, `email`, optional `name`)
- `apps/auth-service/src/auth/strategies/jwt.strategy.ts` — the rules for verifying a JWT token

---

### 3. Content Service (`apps/content-service/`) — Port 3002

**Handles the actual "content" — posts, articles, or any other items users create.**

This service also only talks to the Gateway, never to the outside world directly. It trusts the Gateway to have already verified the user's identity before the request arrives.

The Gateway passes the verified user ID in a special internal header (`x-user-id`). The Content Service uses this to know who is making the request.

What it does:

- **Create content** — saves a new item (title + body) and records who owns it.
- **List my content** — returns all items belonging to the current user.
- **Get one item** — returns a specific item, but only if the current user owns it (ownership validation).
- **Dummy data** — serves hardcoded blogs and fake users at `/dummy/blogs` and `/dummy/users` with no auth required. Useful for quickly testing an HTTP client without needing an account.
- **Health check** — `GET /health` queries the database via a Prisma health indicator; used by the Gateway's readiness probe.

Key files:
- `apps/content-service/src/content/content.service.ts` — the logic for creating, listing, and fetching content with ownership checks
- `apps/content-service/src/content/content.controller.ts` — receives HTTP requests and calls the service; rejects any request that does not include a user ID
- `apps/content-service/src/dummy/dummy.service.ts` — returns hardcoded blogs and fake users; no database involved

---

### 4. Notification Service (`apps/notification-service/`) — Port 3004 (HTTP) + RabbitMQ

**A general-purpose email sending service with a built-in template registry and user-owned custom templates.**

Unlike the other services, the Notification Service runs as a **hybrid** — it is both a standard HTTP server (port 3004) and a RabbitMQ microservice in the same process. This means it can receive email triggers two ways: via an event from the message queue, or via a direct HTTP call from the Gateway.

All HTTP endpoints are **internal-only**, protected by a shared secret header (`x-internal-key`). The Gateway validates the caller's JWT first, then forwards requests with the internal key. External clients never talk to port 3004 directly.

**Built-in template registry** — a set of named system templates defined in `libs/contracts`. Callers identify the template by string ID and supply template-specific data as a free-form object.

| Template ID | Required data | Optional data |
|---|---|---|
| `welcome` | `email` | — |
| `password-reset` | `email`, `resetLink` | — |
| `feature-announcement` | `email`, `featureName`, `description` | `ctaLabel`, `ctaUrl` |

**User-defined templates** — users can create their own custom HTML email templates and store them in the database. These are managed via `/user-templates` (CRUD, authenticated) and can be referenced like any built-in template when sending email.

What it does:

- **Listen for `user.created` events** — connects to the `notification_queue` on RabbitMQ at startup; sends a welcome email when a new user registers.
- **Handle `POST /notify/send`** — accepts `{ templateId, to[], templateData }`, looks up the template in the built-in registry, sends to all recipients in parallel via Resend.
- **Manage user templates** — `POST /user-templates`, `GET /user-templates`, `GET /user-templates/:id`, `DELETE /user-templates/:id`; all internal-only, keyed by `x-user-id`; persisted to the `user_templates` database table.
- **Fail gracefully** — Resend errors are caught and logged; the RabbitMQ message is acknowledged so the queue is not blocked.

Key files:
- `apps/notification-service/src/notification/notification.controller.ts` — `@EventPattern` handler (RMQ) and `POST /notify/send` (HTTP), guarded by `InternalKeyGuard`
- `apps/notification-service/src/notification/notification.service.ts` — `handleUserCreated` and `sendEmail` logic; uses `TemplateRegistry`
- `apps/notification-service/src/email/template-registry.ts` — maps template IDs to template instances; throws `NotFoundException` for unknown IDs
- `apps/notification-service/src/email/email.service.ts` — wraps Resend SDK; sends the rendered HTML
- `apps/notification-service/src/email/templates/` — one file per template; each implements `EmailTemplate<T>` with its own typed data shape
- `apps/notification-service/src/guards/internal-key.guard.ts` — rejects HTTP requests where `x-internal-key` does not match `INTERNAL_NOTIFICATION_KEY`
- `apps/notification-service/src/user-templates/user-templates.controller.ts` — CRUD for user-defined templates; protected by `InternalKeyGuard`, reads `x-user-id` header for ownership
- `apps/notification-service/src/user-templates/user-templates.service.ts` — creates, lists, fetches, and deletes `UserTemplate` rows via Prisma
- `apps/notification-service/src/prisma/prisma.service.ts` — Prisma connection for the notification service's own database access

---

### 5. URL Shortener Service (`apps/url-shortener/`) — Port 3003

**Creates, resolves, and tracks short links with a 30-day expiry.**

Like the Content Service, the URL Shortener only talks to the Gateway — never directly to clients. The Gateway forwards the verified user ID in the `x-user-id` header, so the service always knows who is making the request.

The public redirect endpoint (`GET /s/:slug`) is the exception: the Gateway exposes it without any auth guard, and the URL Shortener handles it directly, recording a click before issuing the redirect.

What it does:

- **Health check** — `GET /health` queries the database via a Prisma health indicator; used by the Gateway's readiness probe.
- **Create a short link** — takes a `targetUrl`, optional custom slug, optional `expiresInDays` (1–365), and a `noExpiry` flag; generates a random 6-character slug if none is supplied; defaults to 30-day expiry; `noExpiry: true` stores `null` for `expiresAt` so the link never expires.
- **SSRF protection** — after URL format validation, the hostname is resolved via DNS and rejected if it resolves to a private or loopback address (`127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `::1`, etc.), preventing the redirect service from being used as a proxy to reach internal infrastructure.
- **List my links** — returns paginated links for the authenticated user (default 20 per page, max 100), newest first, with a live click count and total/pages metadata.
- **Update a link** — `PATCH /links/:slug` lets the owner change the `targetUrl` and/or reset the expiry without changing the slug. The SSRF check is re-run if `targetUrl` changes.
- **Delete a link** — removes a link; only the owner can delete their own links (403 if someone else tries).
- **Analytics** — `GET /links/:slug/analytics` returns total all-time clicks, a daily click breakdown for the last 30 days, and the most recent click timestamp.
- **Resolve and redirect** — given a slug, records a click event and returns the `targetUrl`; throws 410 Gone if the link has expired; never-expiring links (`expiresAt = null`) always resolve.
- **Nightly cleanup** — a `@Cron` job at 2 AM automatically deletes all expired links from the database.

Key files:
- `apps/url-shortener/src/links/links.service.ts` — create, list, update, delete, resolve, and analytics logic; includes `validateNoSsrf()` and `buildExpiry()` helpers; slug generation uses Node's built-in `crypto` module
- `apps/url-shortener/src/links/links.controller.ts` — `POST /links`, `GET /links`, `GET /links/:slug/analytics`, `PATCH /links/:slug`, `DELETE /links/:slug`; validates the `x-user-id` header is present
- `apps/url-shortener/src/links/cleanup.service.ts` — nightly cron job that deletes expired `ShortLink` rows; logs the deleted count on each run
- `apps/url-shortener/src/redirect/redirect.controller.ts` — `GET /s/:slug`; calls `resolveAndTrack` and issues a 302 redirect using NestJS's `@Redirect()` decorator

---

## Shared Code (`libs/contracts/`)

Services need to agree on what data looks like when they talk to each other. This library holds those shared definitions — both TypeScript interfaces (types only) and runtime objects (values that exist at runtime).

**`libs/contracts/src/events/user-created.event.ts`**

When a user registers, the Auth Service publishes a `user.created` event to RabbitMQ. The Notification Service listens for this event and sends a welcome email. Both services import this shared contract so they agree on the exact shape of the message:

```ts
export interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}
```

Having the contract in a shared library means neither service needs to know anything about the other — they only need to agree on the message shape. A third service (e.g., an analytics service) could listen to the same event without any changes to the Auth Service or Notification Service.

**`libs/contracts/src/commands/send-email.command.ts`**

The shape of the body sent to `POST /notify/send`. Shared between the Gateway (which constructs the request) and the Notification Service (which receives it):

```ts
export interface SendEmailCommand {
  templateId: string;              // e.g. "welcome", "password-reset"
  to: string[];                    // one or more recipient addresses
  templateData: Record<string, string>;  // template-specific fields
}
```

**`libs/contracts/src/templates/`**

Template definitions shared between the Gateway's public listing endpoints and any future consumer. Unlike the event/command interfaces above (which are types only), this directory exports real runtime values — objects that exist at runtime and can be iterated over.

```ts
// template.interface.ts — the shape every template must satisfy
export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  subject: string;
  fields: TemplateField[];          // metadata about each data field
  previewData: Record<string, string>;  // sample values used for preview rendering
  html(data: Record<string, string>): string;
}

// registry.ts — the live map imported by the gateway controller
export const TEMPLATES: Record<string, TemplateDefinition> = {
  'welcome': welcomeTemplate,
  'password-reset': passwordResetTemplate,
  'feature-announcement': featureAnnouncementTemplate,
};
```

The Gateway's `TemplatesController` imports `TEMPLATES` directly and serves it over HTTP — no database query, no downstream service call. Adding a new template means adding one file to `libs/contracts/src/templates/` and registering it in `registry.ts`.

---

## The Database (`prisma/schema.prisma`)

One PostgreSQL database is shared, with four tables:

**`users` table** — owned by the Auth Service
| Column | What it stores |
|---|---|
| id | A unique ID (UUID) for every user |
| email | The user's email address (must be unique) |
| password_hash | The password, scrambled securely with bcrypt (nullable — Google-only users have no password) |
| google_id | The user's Google account ID (nullable — email/password users have no Google ID) |
| created_at | When the account was created |

**`content` table** — owned by the Content Service
| Column | What it stores |
|---|---|
| id | A unique ID for every piece of content |
| title | The title of the content |
| body | The full text of the content |
| owner_id | The ID of the user who created it (links to `users.id`) |
| created_at | When the content was created |

The `owner_id` column is how the system enforces ownership — you can only read or modify content where `owner_id` matches your user ID.

**`ShortLink` table** — owned by the URL Shortener Service
| Column | What it stores |
|---|---|
| id | A unique ID (cuid) for every short link |
| slug | The short identifier in the URL (must be unique, e.g. `abc123`) |
| targetUrl | The full URL the short link redirects to |
| userId | The ID of the user who created it |
| expiresAt | When this link stops working — nullable; `null` means the link never expires |
| createdAt | When the link was created |

**`ClickEvent` table** — owned by the URL Shortener Service
| Column | What it stores |
|---|---|
| id | A unique ID for every click |
| shortLinkId | Which short link was clicked (links to `ShortLink.id`) |
| clickedAt | When the click happened |

`ClickEvent` rows are deleted automatically when their parent `ShortLink` is deleted (`onDelete: Cascade`). The click count displayed in the API is derived by counting how many `ClickEvent` rows belong to a given `ShortLink`.

**`user_templates` table** — owned by the Notification Service
| Column | What it stores |
|---|---|
| id | A unique ID (UUID) for every template |
| userId | The ID of the user who created it |
| name | A human-readable label for the template |
| subject | The email subject line |
| html | The full HTML body of the email |
| createdAt | When the template was created |
| updatedAt | When the template was last modified |

User-defined templates are completely separate from the built-in system templates in `libs/contracts`. They are stored per-user and can be managed via the `/user-templates` API endpoints.

---

## How a Typical Request Flows

### Registering

```
1. Client sends:  POST /auth/register  { email, password }
2. Gateway receives it, no auth check needed, forwards to Auth Service
3. Auth Service checks the email is not already taken
4. Auth Service hashes the password and saves the user to the database
5. Auth Service publishes user.created event to RabbitMQ (fire-and-forget)
6. Auth Service returns: { accessToken, refreshToken }
7. Gateway passes the response back to the client

Meanwhile, asynchronously:
8. Notification Service receives the user.created event from RabbitMQ
9. Notification Service sends a welcome email to the new user via Resend API
```

### Signing in with Google

```
1. User opens browser:  GET /auth/google
2. Gateway's GoogleAuthGuard triggers Passport GoogleStrategy
3. Passport redirects browser to Google's OAuth consent screen
4. User authenticates on Google and grants permission
5. Google redirects browser to: GET /auth/google/callback?code=...
6. Gateway's GoogleStrategy exchanges the code for a Google profile
   (extracts googleId, email, name)
7. Gateway calls: POST /auth/google-profile → Auth Service
8. Auth Service runs find-or-create logic:
   a. Found by googleId → return existing user
   b. Not found, but email matches an existing account → link googleId to that account
   c. Neither → create a new user (no password_hash), emit user.created event
9. Auth Service issues JWT pair and returns { accessToken, refreshToken }
10. Gateway returns tokens as JSON to the browser
```

### Fetching Dummy Data (no auth)

```
1. Client sends:  GET /dummy/blogs
2. Gateway receives it — no JWT check, route is fully public
3. Gateway forwards to Content Service: GET /dummy/blogs
4. Content Service DummyService returns 5 hardcoded blog objects
5. Gateway passes the response back to the client
```

### Creating Content (authenticated)

```
1. Client sends:  POST /content  { title, body }
                  Authorization: Bearer <accessToken>
2. Gateway receives it, checks the JWT token
3. If token is valid → Gateway extracts the userId from the token
4. Gateway forwards to Content Service with header x-user-id: <userId>
5. Content Service saves the item with ownerId = userId
6. Returns the saved content item
7. Gateway passes the response back to the client
```

### Sending a Templated Email

```
1. Client sends:  POST /notify/send  { templateId, to[], templateData }
                  Authorization: Bearer <accessToken>
2. Gateway checks the JWT token
3. Gateway's NotificationProxyService forwards to http://notification-service:3004/notify/send
   with header x-internal-key: <INTERNAL_NOTIFICATION_KEY>
4. NotificationService.InternalKeyGuard validates the key
5. TemplateRegistry looks up the templateId — throws 404 if unknown
6. EmailService calls Resend for each recipient in parallel
7. Returns { sent: <count> } back through the Gateway to the client

If the templateId is unknown:
  Step 5 throws NotFoundException → 404 propagates back to the client
```

### Logging Out

```
1. Client sends:  POST /auth/logout
2. Gateway clears two httpOnly cookies: access_token and refresh_token
   (domain scoped to .ruturaj.xyz in production; no domain restriction in development)
3. Gateway returns: { success: true }

Note: logout only clears cookies. The JWT itself is not invalidated server-side — it
remains valid until its 15-minute expiry. API clients using Bearer tokens should simply
discard the token on their end.
```

### Managing a Custom Email Template

```
Creating a custom template (authenticated):
1. Client sends:  POST /user-templates  { name, subject, html }
                  Authorization: Bearer <accessToken>
2. Gateway checks the JWT token, extracts userId
3. Gateway forwards to Notification Service with headers:
     x-internal-key: <INTERNAL_NOTIFICATION_KEY>
     x-user-id: <userId>
4. Notification Service saves the template to user_templates table
5. Returns the saved template object

Listing templates:
1. Client sends:  GET /user-templates
                  Authorization: Bearer <accessToken>
2. Gateway checks JWT, forwards to Notification Service with userId header
3. Notification Service returns all templates for that user

Deleting (204 No Content):
1. Client sends:  DELETE /user-templates/:id
                  Authorization: Bearer <accessToken>
2. Gateway checks JWT, forwards with userId
3. Notification Service checks ownership (throws 404 if not found or owned by another user)
4. Deletes the row — no response body
```

### Creating and Following a Short Link

```
Creating (authenticated):
1. Client sends:  POST /links  { targetUrl: "https://...", slug: "my-link", expiresInDays: 7 }
                  Authorization: Bearer <accessToken>
2. Gateway checks the JWT token, extracts userId
3. Gateway forwards to URL Shortener with header x-user-id: <userId>
4. URL Shortener resolves the hostname and rejects it if it points to a private address (SSRF check)
5. URL Shortener checks the slug is not already taken
6. URL Shortener saves ShortLink with expiresAt = now + 7 days (null if noExpiry: true)
7. Returns { slug, targetUrl, expiresAt, createdAt, clickCount: 0 }
8. Gateway passes the response back to the client

Following (public, no token needed):
1. Client sends:  GET /s/my-link
2. Gateway forwards to URL Shortener — no JWT guard on this route
3. URL Shortener looks up the slug, checks it has not expired
4. URL Shortener inserts a ClickEvent row
5. URL Shortener returns { url: "https://...", statusCode: 302 }
6. Gateway issues a 302 redirect to the client's browser
7. Browser follows the redirect to the target URL
```

---

## Frontends (`frontends/`)

Two Next.js (App Router) frontends ship alongside the backend, each talking exclusively to the API Gateway.

### `frontends/links` — URL Shortener UI

A clean dashboard for managing short links. Deployed at `links.ruturaj.xyz`.

- Google OAuth login (redirects through the gateway's `/auth/google` flow; cookies are set automatically)
- Create short links from any URL, with optional custom slug and expiry
- View all links with live click counts
- Delete links
- Protected dashboard — unauthenticated users are redirected to the login page

### `frontends/pulse` — Email / Notification UI

A management interface for email templates and sending. Deployed at `pulse.ruturaj.xyz`.

- Browse the built-in system templates (`GET /templates`) and preview their rendered HTML
- Manage user-defined custom templates (`/user-templates` CRUD)
- Send emails directly via the gateway's `POST /notify/send` endpoint

Both frontends use **Tailwind CSS** and **TypeScript**. They share no code with each other or with the backend.

**Running a frontend locally:**
```bash
cd frontends/links   # or frontends/pulse
pnpm install
pnpm dev             # links runs on http://localhost:3004 by default
```

---

## Running the Project

Everything runs inside Docker — you do not need to install Node.js or PostgreSQL manually.

```bash
# Start all services
docker compose up

# Run database migrations (first time only)
npx prisma migrate dev
```

Services will be available at:
- Gateway (your entry point): `http://localhost:3000`
- Auth Service (internal): `http://localhost:3001`
- Content Service (internal): `http://localhost:3002`
- URL Shortener Service (internal): `http://localhost:3003`
- Notification Service (internal): `http://localhost:3004`
- RabbitMQ management UI: `http://localhost:15672` (guest / guest — local dev only)

Useful URLs once the stack is running:
- `http://localhost:3000/health` — gateway liveness check
- `http://localhost:3000/health/ready` — gateway readiness (pings all downstream services)
- `http://localhost:3000/docs` — Swagger / OpenAPI explorer (interactive, no auth required to browse)

---

## Environment Variables (`.env`)

Sensitive settings are stored in a `.env` file (not committed to git). Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | How to connect to PostgreSQL |
| `JWT_ACCESS_SECRET` | Secret key used to sign access tokens (keep this private) |
| `JWT_REFRESH_SECRET` | Secret key used to sign refresh tokens (keep this private) |
| `RABBITMQ_URL` | Connection URL for RabbitMQ (e.g. `amqp://guest:guest@localhost:5672`) |
| `RESEND_API_KEY` | API key for the Resend email service |
| `SMTP_FROM` | The `From` address on outgoing emails (e.g. `Atlas <no-reply@yourdomain.com>`) |
| `INTERNAL_NOTIFICATION_KEY` | Shared secret between the Gateway and Notification Service; generate with `openssl rand -hex 32` |
| `NOTIFICATION_SERVICE_PORT` | Port the Notification Service HTTP server listens on (default `3004`) |
| `NOTIFICATION_SERVICE_URL` | Base URL the Gateway uses to reach the Notification Service (e.g. `http://localhost:3004`) |
| `URL_SHORTENER_PORT` | Port the URL Shortener Service listens on (default `3003`) |
| `URL_SHORTENER_URL` | Base URL the Gateway uses to reach the URL Shortener (e.g. `http://localhost:3003`) |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Must exactly match the redirect URI registered in Google Cloud Console (e.g. `http://localhost:3000/auth/google/callback`) |

---

## Tech Stack — Plain English

| Tool | What it is |
|---|---|
| **NestJS** | The framework used to build each service — provides structure and conventions |
| **TypeScript** | The programming language — like JavaScript but with type safety |
| **Prisma** | Talks to the database so the code does not have to write raw SQL |
| **PostgreSQL** | The database where all data is permanently stored |
| **JWT** | The token system used for authentication |
| **bcrypt** | The algorithm used to safely scramble passwords |
| **RabbitMQ** | The message broker that passes events between services |
| **Resend** | Sends transactional emails from the Notification Service via the Resend API |
| **Docker** | Packages everything into containers so it runs the same everywhere |
| **pnpm** | The package manager — installs all the dependencies |

---

## Future Extensions

The architecture is designed so these can be added without changing any existing service:

- **Job Worker** — handles background tasks and queues
- **Redis caching** — speeds up frequent database reads
- **RBAC** — role-based permissions (admin, editor, viewer)
- **Custom-template email sending** — allow `/notify/send` to resolve a user template by ID (currently only built-in registry templates are supported)
