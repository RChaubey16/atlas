# Atlas — Project Notes

## What Is This Project?

Atlas is a backend system built to demonstrate how real-world applications are structured at scale. Instead of one big program that does everything, Atlas is split into several smaller, focused programs called **microservices** — each responsible for one specific job.

Think of it like a restaurant:
- There is a **front desk** (the Gateway) that greets every customer and directs them to the right place.
- There is a **staff office** (the Auth Service) that checks IDs and issues visitor passes.
- There is a **kitchen** (the Content Service) that handles the actual food — in this case, content like posts or articles.

The front desk never makes food, and the kitchen never checks IDs. Each part does one thing well.

---

## The Big Picture

```
You (the user / app)
        |
        ▼
  [ API Gateway ]        ← The only door into the system (port 3000)
        |
   ┌────┴────┐
   ▼         ▼
[Auth      [Content
 Service]   Service]
   |             |
   └──────┬──────┘
          ▼
     [ PostgreSQL ]      ← The database where everything is saved
```

Every request from the outside world goes through the **Gateway first**. The Gateway decides where to send it and, for protected routes, checks that the user has a valid pass (JWT token) before letting them through.

---

## The Three Services

### 1. API Gateway (`apps/gateway/`) — Port 3000

**The front door of the entire system.**

Every API call from a client (mobile app, browser, etc.) hits the Gateway first. It does two things:

- **Routes requests** — forwards `/auth/...` calls to the Auth Service and `/content/...` calls to the Content Service.
- **Checks identity** — for content routes, it verifies the user's JWT token before forwarding. If the token is missing or fake, the request is rejected here and never reaches the other services.

The Gateway does not have its own database. It is purely a traffic director.

Key files:
- `apps/gateway/src/auth/jwt.strategy.ts` — teaches the gateway how to read and verify a JWT token
- `apps/gateway/src/auth/jwt-auth.guard.ts` — the actual "bouncer" that blocks unauthenticated requests
- `apps/gateway/src/auth/auth-proxy.service.ts` — forwards login/register calls to the Auth Service
- `apps/gateway/src/content/content-proxy.service.ts` — forwards content calls to the Content Service, passing the verified user ID along

---

### 2. Auth Service (`apps/auth-service/`) — Port 3001

**Handles everything to do with identity: who you are and proving it.**

This service never talks to the outside world directly — only the Gateway calls it. It owns the `users` table in the database.

What it does:

- **Register** — takes an email and password, saves the user (password is hashed and never stored in plain text), and returns two tokens.
- **Login** — checks the email and password, and if correct, returns two tokens.
- **Refresh** — when your short-lived access token expires, you can swap your refresh token for a new pair without logging in again.

**What is a JWT token?**
Think of it as a digitally signed visitor badge. It contains your user ID and email, and it proves you are who you say you are without the server needing to look you up in the database every time. It has an expiry — access tokens last 15 minutes, refresh tokens last 7 days.

Key files:
- `apps/auth-service/src/auth/auth.service.ts` — the core logic: register, login, refresh, and issue tokens
- `apps/auth-service/src/auth/dto/register.dto.ts` — defines what a valid registration request looks like (email + password of at least 8 characters)
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

Key files:
- `apps/content-service/src/content/content.service.ts` — the logic for creating, listing, and fetching content with ownership checks
- `apps/content-service/src/content/content.controller.ts` — receives HTTP requests and calls the service; rejects any request that does not include a user ID

---

## Shared Code (`libs/contracts/`)

Services need to agree on what data looks like when they talk to each other. This library holds those shared definitions.

**`libs/contracts/src/events/user-created.event.ts`**

When a user registers, the Auth Service could notify other services (e.g., a future notification service that sends a welcome email). The contract defines what that notification looks like:

```ts
// Every service that listens for "a user was created" expects this shape
export interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}
```

Right now the event is logged to the console. In the future it can be wired to a message broker (like RabbitMQ or Kafka) without changing any service logic — just the plumbing.

---

## The Database (`prisma/schema.prisma`)

One PostgreSQL database is shared, with two tables:

**`users` table** — owned by the Auth Service
| Column | What it stores |
|---|---|
| id | A unique ID (UUID) for every user |
| email | The user's email address (must be unique) |
| password_hash | The password, scrambled securely with bcrypt |
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

---

## How a Typical Request Flows

### Registering

```
1. Client sends:  POST /auth/register  { email, password }
2. Gateway receives it, no auth check needed, forwards to Auth Service
3. Auth Service checks the email is not already taken
4. Auth Service hashes the password and saves the user to the database
5. Auth Service returns: { accessToken, refreshToken }
6. Gateway passes the response back to the client
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

---

## Environment Variables (`.env`)

Sensitive settings are stored in a `.env` file (not committed to git). Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | How to connect to PostgreSQL |
| `JWT_ACCESS_SECRET` | Secret key used to sign access tokens (keep this private) |
| `JWT_REFRESH_SECRET` | Secret key used to sign refresh tokens (keep this private) |

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
| **Docker** | Packages everything into containers so it runs the same everywhere |
| **pnpm** | The package manager — installs all the dependencies |

---

## Future Extensions

The architecture is designed so these can be added without changing any existing service:

- **Notification Service** — listens for `user.created` events and sends welcome emails
- **Job Worker** — handles background tasks and queues
- **Redis caching** — speeds up frequent database reads
- **RBAC** — role-based permissions (admin, editor, viewer)
