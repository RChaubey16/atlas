# Notification Service Design

**Date:** 2026-04-08
**Status:** Approved

---

## Overview

A standalone NestJS microservice (`apps/notification-service/`) that listens for `user.created` events published to RabbitMQ by auth-service and sends a welcome email to the newly registered user via Nodemailer SMTP.

---

## Architecture & Data Flow

```
Client
  ↓
API Gateway (port 3000)
  ↓
Auth Service (port 3001)
  ├── registers user
  ├── issues JWT
  └── emits user.created → RabbitMQ (exchange: atlas.events)
                                ↓
                      Notification Service (no HTTP port)
                          ├── consumes user.created
                          ├── renders WelcomeEmailTemplate
                          └── sends email via Nodemailer SMTP
```

- RabbitMQ runs as a new Docker container (`atlas-rabbitmq`, port 5672, management UI on 15672)
- notification-service bootstraps via `NestFactory.createMicroservice()` — no HTTP port, purely event-driven
- auth-service gets a `ClientsModule` registration with `ClientProxy` injected into `AuthService`, replacing the existing `console.log` stub

---

## File Structure

### New app

```
apps/notification-service/
  src/
    main.ts                          # createMicroservice() with RabbitMQ transport
    notification.module.ts           # root module
    notification/
      notification.service.ts        # @EventPattern handler, orchestrates sending
    email/
      email.service.ts               # Nodemailer wrapper — sendMail()
      email.module.ts                # provides EmailService
      templates/
        email-template.interface.ts  # interface: { subject: string; html(data): string }
        welcome.template.ts          # WelcomeEmailTemplate: subject + html(email)
```

### Changes to existing files

| File | Change |
|---|---|
| `apps/auth-service/src/auth/auth.module.ts` | Add `ClientsModule.register()` with RabbitMQ transport |
| `apps/auth-service/src/auth/auth.service.ts` | Inject `ClientProxy`, replace `console.log` with `client.emit()` |
| `docker-compose.yml` | Add `rabbitmq` and `notification-service` containers |
| `nest-cli.json` | Register `notification-service` app |
| `.env` | Add `RABBITMQ_URL`, `SMTP_*` vars |

### No changes needed

`libs/contracts/src/events/user-created.event.ts` — `UserCreatedEvent` and `USER_CREATED_EVENT` are already correct.

---

## Message Contract

**Event name:** `user.created` (from `USER_CREATED_EVENT` constant)

**Payload** (`UserCreatedEvent`):
```ts
{
  userId: string;
  email: string;
  createdAt: Date;
}
```

Published via `ClientProxy.emit()` (fire-and-forget). auth-service does not wait for a response.

---

## Email Template Design

Each email type is a class implementing `EmailTemplate`:

```ts
interface EmailTemplate {
  subject: string;
  html(data: { email: string }): string;
}
```

`WelcomeEmailTemplate` is the first implementation. Adding new templates (password reset, content published, etc.) means adding a new class — no changes to `EmailService`.

---

## Error Handling

- `EmailService.sendMail()` wraps `transporter.sendMail()` in try/catch and logs failures — a failed email must not crash the consumer or cause RabbitMQ to re-queue indefinitely
- `NotificationService` logs both successful sends and errors with `userId` and `email` for debuggability
- RabbitMQ connection failures on startup: NestJS microservice transport retries automatically — `depends_on: rabbitmq` in Docker Compose handles startup ordering

---

## Testing

| File | What is tested |
|---|---|
| `welcome.template.spec.ts` | subject string, html contains user email |
| `email.service.spec.ts` | mock Nodemailer transporter, assert `sendMail` called with correct args |
| `notification.service.spec.ts` | mock `EmailService`, assert called with correct data on event |
| `auth.service.spec.ts` (update) | assert `client.emit()` called with `USER_CREATED_EVENT` and correct payload on register |

---

## Environment Variables

```env
# RabbitMQ (auth-service + notification-service)
RABBITMQ_URL="amqp://guest:guest@localhost:5672"

# SMTP (notification-service only)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Atlas <your@gmail.com>"
```

Docker Compose overrides `RABBITMQ_URL` to use container name (`atlas-rabbitmq`) internally.

---

## Docker Compose Additions

```yaml
rabbitmq:
  image: rabbitmq:3-management-alpine
  container_name: atlas-rabbitmq
  ports:
    - "5672:5672"
    - "15672:15672"

notification-service:
  build: .
  container_name: atlas-notification-service
  command: pnpm run start:notification
  environment:
    RABBITMQ_URL: amqp://guest:guest@atlas-rabbitmq:5672
    SMTP_HOST: ...
    SMTP_PORT: ...
    SMTP_USER: ...
    SMTP_PASS: ...
    SMTP_FROM: ...
  depends_on:
    - rabbitmq
```
