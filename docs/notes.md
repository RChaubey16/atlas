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
   ┌────┼────────────────┐
   ▼    ▼                ▼
[Auth  [Content     [URL Shortener
Svc]    Service]      Service]
   |        |              |
   └────────┴──────────────┘
                 ▼
           [ PostgreSQL ]  ← The database where everything is saved

[Auth Service] --[user.created event]--> [ RabbitMQ ] --> [ Notification Service ] --> Resend API
```

Every request from the outside world goes through the **Gateway first**. The Gateway decides where to send it and, for protected routes, checks that the user has a valid pass (JWT token) before letting them through.

When a user registers, the Auth Service publishes a `user.created` event to **RabbitMQ**. The Notification Service listens for this event in the background and sends a welcome email via SMTP — completely decoupled from the HTTP request.

Short link management routes (`/links/*`) are guarded by the same JWT check. The public redirect route (`/s/:slug`) intentionally bypasses the guard — anyone can follow a short link without an account.

---

## The Services

### 1. API Gateway (`apps/gateway/`) — Port 3000

**The front door of the entire system.**

Every API call from a client (mobile app, browser, etc.) hits the Gateway first. It does two things:

- **Routes requests** — forwards `/auth/...` calls to the Auth Service and `/content/...` calls to the Content Service. Also serves `/dummy/...` routes publicly without any auth check.
- **Checks identity** — for content routes, it verifies the user's JWT token before forwarding. If the token is missing or fake, the request is rejected here and never reaches the other services. Dummy and auth routes are intentionally exempt.
- **Owns the Google OAuth flow** — the Gateway holds the `GoogleStrategy` (Passport) and the Google client credentials. It initiates the redirect to Google and handles the callback. After Google confirms identity, it forwards the profile to the Auth Service to issue a JWT pair. This keeps external OAuth logic at the boundary and auth business logic inside the Auth Service.

The Gateway does not have its own database. It is purely a traffic director.

Key files:
- `apps/gateway/src/auth/jwt.strategy.ts` — teaches the gateway how to read and verify a JWT token
- `apps/gateway/src/auth/jwt-auth.guard.ts` — the actual "bouncer" that blocks unauthenticated requests
- `apps/gateway/src/auth/strategies/google.strategy.ts` — Passport Google OAuth 2.0 strategy; extracts `googleId`, `email`, and `name` from the Google profile
- `apps/gateway/src/auth/guards/google-auth.guard.ts` — triggers the Google redirect on `GET /auth/google` and validates the callback on `GET /auth/google/callback`
- `apps/gateway/src/auth/auth-proxy.service.ts` — forwards login/register/Google-profile calls to the Auth Service
- `apps/gateway/src/content/content-proxy.service.ts` — forwards content calls to the Content Service, passing the verified user ID along
- `apps/gateway/src/dummy/dummy-proxy.controller.ts` — serves `/dummy/blogs` and `/dummy/users` with no guard (fully public)
- `apps/gateway/src/url-shortener/url-shortener-proxy.service.ts` — forwards `/links/*` calls to the URL Shortener Service and handles slug resolution for redirects
- `apps/gateway/src/url-shortener/url-shortener-proxy.controller.ts` — guarded by `JwtAuthGuard`; passes `userId` from the token down to the URL Shortener
- `apps/gateway/src/url-shortener/url-shortener-redirect.controller.ts` — handles `GET /s/:slug` with no guard; issues a 302 redirect to the client

---

### 2. Auth Service (`apps/auth-service/`) — Port 3001

**Handles everything to do with identity: who you are and proving it.**

This service never talks to the outside world directly — only the Gateway calls it. It owns the `users` table in the database.

What it does:

- **Register** — takes an email and password, saves the user (password is hashed and never stored in plain text), and returns two tokens.
- **Login** — checks the email and password, and if correct, returns two tokens.
- **Refresh** — when your short-lived access token expires, you can swap your refresh token for a new pair without logging in again.
- **Google profile** — internal endpoint called by the Gateway after a successful Google OAuth callback. Finds an existing user by `googleId`, links a `googleId` to an existing email/password account if the email matches, or creates a brand-new user. Always returns a JWT pair.

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

Key files:
- `apps/content-service/src/content/content.service.ts` — the logic for creating, listing, and fetching content with ownership checks
- `apps/content-service/src/content/content.controller.ts` — receives HTTP requests and calls the service; rejects any request that does not include a user ID
- `apps/content-service/src/dummy/dummy.service.ts` — returns hardcoded blogs and fake users; no database involved

---

### 4. Notification Service (`apps/notification-service/`) — No HTTP port

**Listens for events from RabbitMQ and sends transactional emails.**

Unlike the other services, the Notification Service is not an HTTP server — it is a **NestJS microservice** that connects directly to RabbitMQ and waits for messages. It never receives requests from the Gateway or any HTTP client.

When the Auth Service publishes a `user.created` event after a successful registration, the Notification Service receives that message and sends a welcome email to the new user via the Resend API.

This pattern is called **event-driven architecture**: services communicate by publishing and consuming events rather than making direct HTTP calls. The Auth Service does not know or care whether the Notification Service exists — it just fires an event and moves on.

What it does:

- **Listen for `user.created` events** — connects to the `notification_queue` on RabbitMQ at startup.
- **Send welcome email** — on each event, calls Resend with a pre-defined `WelcomeEmailTemplate`.
- **Fail gracefully** — Resend errors are caught and logged; the message is acknowledged so the queue is not blocked.

Key files:
- `apps/notification-service/src/notification/notification.service.ts` — the `@EventPattern` handler that receives the event and delegates to EmailService
- `apps/notification-service/src/email/email.service.ts` — wraps Resend SDK; reads `RESEND_API_KEY` and `SMTP_FROM` from environment variables
- `apps/notification-service/src/email/templates/welcome.template.ts` — the HTML email template; implements the `EmailTemplate` interface
- `apps/notification-service/src/email/email-template.interface.ts` — the interface; adding a new email type means adding a new class that implements this

---

### 5. URL Shortener Service (`apps/url-shortener/`) — Port 3003

**Creates, resolves, and tracks short links with a 30-day expiry.**

Like the Content Service, the URL Shortener only talks to the Gateway — never directly to clients. The Gateway forwards the verified user ID in the `x-user-id` header, so the service always knows who is making the request.

The public redirect endpoint (`GET /s/:slug`) is the exception: the Gateway exposes it without any auth guard, and the URL Shortener handles it directly, recording a click before issuing the redirect.

What it does:

- **Create a short link** — takes a `targetUrl` and an optional custom slug; generates a random 6-character slug if none is supplied; link expires after 30 days.
- **List my links** — returns all links for the authenticated user, newest first, with a live click count.
- **Delete a link** — removes a link; only the owner can delete their own links (403 if someone else tries).
- **Resolve and redirect** — given a slug, records a click event and returns the `targetUrl`; throws 410 Gone if the link has expired.
- **Nightly cleanup** — a `@Cron` job at 2 AM automatically deletes all expired links from the database.

Key files:
- `apps/url-shortener/src/links/links.service.ts` — create, list, delete, and resolve logic; slug generation uses Node's built-in `crypto` module
- `apps/url-shortener/src/links/links.controller.ts` — `POST /links`, `GET /links`, `DELETE /links/:slug`; validates the `x-user-id` header is present
- `apps/url-shortener/src/links/cleanup.service.ts` — nightly cron job that deletes expired `ShortLink` rows
- `apps/url-shortener/src/redirect/redirect.controller.ts` — `GET /s/:slug`; calls `resolveAndTrack` and issues a 302 redirect using NestJS's `@Redirect()` decorator

---

## Shared Code (`libs/contracts/`)

Services need to agree on what data looks like when they talk to each other. This library holds those shared definitions.

**`libs/contracts/src/events/user-created.event.ts`**

When a user registers, the Auth Service publishes a `user.created` event to RabbitMQ. The Notification Service listens for this event and sends a welcome email. Both services import this shared contract so they agree on the exact shape of the message:

```ts
// Every service that produces or consumes "user.created" uses this shape
export interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}
```

Having the contract in a shared library means neither service needs to know anything about the other — they only need to agree on the message shape. A third service (e.g., an analytics service) could listen to the same event without any changes to the Auth Service or Notification Service.

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
| expiresAt | When this link stops working (30 days after creation) |
| createdAt | When the link was created |

**`ClickEvent` table** — owned by the URL Shortener Service
| Column | What it stores |
|---|---|
| id | A unique ID for every click |
| shortLinkId | Which short link was clicked (links to `ShortLink.id`) |
| clickedAt | When the click happened |

`ClickEvent` rows are deleted automatically when their parent `ShortLink` is deleted (`onDelete: Cascade`). The click count displayed in the API is derived by counting how many `ClickEvent` rows belong to a given `ShortLink`.

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

### Creating and Following a Short Link

```
Creating (authenticated):
1. Client sends:  POST /links  { targetUrl: "https://...", slug: "my-link" }
                  Authorization: Bearer <accessToken>
2. Gateway checks the JWT token, extracts userId
3. Gateway forwards to URL Shortener with header x-user-id: <userId>
4. URL Shortener checks the slug is not already taken
5. URL Shortener saves ShortLink with expiresAt = now + 30 days
6. Returns { slug, targetUrl, expiresAt, createdAt, clickCount: 0 }
7. Gateway passes the response back to the client

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
- RabbitMQ management UI: `http://localhost:15672` (guest / guest — local dev only)

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
