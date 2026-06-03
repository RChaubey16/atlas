# Atlas — Resume & Portfolio Content

## One-liner

> Backend microservices platform built with NestJS, demonstrating service boundaries, async messaging, and production-ready auth patterns.

---

## Portfolio Card

**Atlas**
A NestJS microservices backend with an API Gateway, JWT + Google OAuth auth, URL shortener, async email notifications via RabbitMQ, and a block-based email template builder — all containerised with Docker Compose.

**Stack:** NestJS · TypeScript · PostgreSQL · Prisma · RabbitMQ · Docker · JWT · Google OAuth · Resend

**Links:** [GitHub](#)

---

## Resume Bullets

- Designed and built a **NestJS microservices monorepo** (API Gateway + 3 services) with JWT + Google OAuth 2.0 auth delivered via `httpOnly` cookies for browser clients and Bearer tokens for API clients
- Implemented **async event-driven messaging** between services using RabbitMQ — auth service publishes `user.created`, notification service consumes and sends welcome emails via Resend
- Built a **URL shortener service** with click tracking, 30-day link expiry, and a nightly cleanup cron job
- Created a **block-based email template builder** with 10 block types, `{{variable}}` substitution, and live HTML preview — stored in Postgres and rendered server-side
- Applied production patterns throughout: **rate limiting** (100 req/min per user/IP), **health checks** on all services, structured HTTP request logging, and startup config validation via Joi

---

## Key Features (for longer portfolio writeups)

- **API Gateway** — single entry point; handles CORS, cookie parsing, JWT strategy, Google OAuth flow, throttling, and proxying to downstream services
- **Auth** — register/login/refresh with bcrypt-hashed passwords and rotating JWT pairs; Google OAuth via Passport with redirect-state round-trip
- **URL Shortener** — create/list/delete short links, 302 redirects, per-link click events, scheduled cleanup
- **Notification Service** — hybrid NestJS app (RabbitMQ microservice + HTTP server); internal-key-authenticated endpoint for on-demand emails
- **Email Playground** — full CRUD for block-based email templates; renders to email-safe HTML; send-test via Resend
- **Observability** — liveness and readiness endpoints on every service; gateway readiness pings all downstream `/health` routes
