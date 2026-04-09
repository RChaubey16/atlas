# Notification Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `notification-service` NestJS app that consumes `user.created` events from RabbitMQ and sends a welcome email via Nodemailer SMTP.

**Architecture:** auth-service publishes `user.created` events to RabbitMQ via `ClientProxy.emit()`. notification-service bootstraps as `NestFactory.createMicroservice()` with RabbitMQ transport, receives events via `@EventPattern`, and delegates to `EmailService` which wraps Nodemailer. Email content is provided by a `WelcomeEmailTemplate` class implementing a shared `EmailTemplate` interface — adding new email types means adding a new class only.

**Tech Stack:** `@nestjs/microservices` (RabbitMQ transport), `amqplib`, `nodemailer`, `@types/amqplib`, `@types/nodemailer`, existing `@app/contracts` event types, Jest + `@nestjs/testing` for tests.

**Spec:** `docs/superpowers/specs/2026-04-08-notification-service-design.md`

---

## File Map

### New files (notification-service)
| File | Responsibility |
|---|---|
| `apps/notification-service/tsconfig.app.json` | TS build config for this app |
| `apps/notification-service/src/main.ts` | Bootstrap as RabbitMQ microservice |
| `apps/notification-service/src/notification.module.ts` | Root module wiring |
| `apps/notification-service/src/email/email-template.interface.ts` | `EmailTemplate` interface |
| `apps/notification-service/src/email/templates/welcome.template.ts` | `WelcomeEmailTemplate` class |
| `apps/notification-service/src/email/templates/welcome.template.spec.ts` | Tests |
| `apps/notification-service/src/email/email.service.ts` | Nodemailer wrapper |
| `apps/notification-service/src/email/email.service.spec.ts` | Tests |
| `apps/notification-service/src/email/email.module.ts` | Provides + exports `EmailService` |
| `apps/notification-service/src/notification/notification.service.ts` | `@EventPattern` handler |
| `apps/notification-service/src/notification/notification.service.spec.ts` | Tests |

### Modified files
| File | Change |
|---|---|
| `nest-cli.json` | Register `notification-service` app |
| `package.json` | Add `build:notification`, `start:notification`, `start:prod:notification` scripts |
| `apps/auth-service/src/auth/auth.module.ts` | Add `ClientsModule.register()` with RabbitMQ |
| `apps/auth-service/src/auth/auth.service.ts` | Inject `ClientProxy`, emit event instead of console.log |
| `apps/auth-service/src/auth/auth.service.spec.ts` | New file — test emit on register |
| `docker-compose.yml` | Add `rabbitmq` and `notification-service` containers |

---

## Task 1: Install required packages

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add @nestjs/microservices amqplib nodemailer
```

Expected: packages added to `dependencies` in `package.json`.

- [ ] **Step 2: Install type definitions**

```bash
pnpm add -D @types/amqplib @types/nodemailer
```

Expected: types added to `devDependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @nestjs/microservices, amqplib, nodemailer packages"
```

---

## Task 2: Register notification-service in the monorepo

- [ ] **Step 1: Create tsconfig for notification-service**

Create `apps/notification-service/tsconfig.app.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/notification-service"
  },
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

- [ ] **Step 2: Register in nest-cli.json**

In `nest-cli.json`, add to the `"projects"` object (after `"content-service"`):

```json
"notification-service": {
  "type": "application",
  "root": "apps/notification-service",
  "entryFile": "main",
  "sourceRoot": "apps/notification-service/src",
  "compilerOptions": {
    "tsConfigPath": "apps/notification-service/tsconfig.app.json"
  }
}
```

- [ ] **Step 3: Add npm scripts to package.json**

In `package.json`, add these three lines inside `"scripts"`:

```json
"build:notification": "nest build notification-service",
"start:notification": "nest start notification-service --watch",
"start:prod:notification": "node dist/apps/notification-service/main",
```

- [ ] **Step 4: Commit**

```bash
git add nest-cli.json package.json apps/notification-service/tsconfig.app.json
git commit -m "chore(notification-service): register app in monorepo"
```

---

## Task 3: Email template interface and WelcomeEmailTemplate (TDD)

- [ ] **Step 1: Create the EmailTemplate interface**

Create `apps/notification-service/src/email/email-template.interface.ts`:

```typescript
export interface EmailTemplate {
  subject: string;
  html(data: { email: string }): string;
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/notification-service/src/email/templates/welcome.template.spec.ts`:

```typescript
import { WelcomeEmailTemplate } from './welcome.template';

describe('WelcomeEmailTemplate', () => {
  let template: WelcomeEmailTemplate;

  beforeEach(() => {
    template = new WelcomeEmailTemplate();
  });

  it('should have subject "Welcome to Atlas!"', () => {
    expect(template.subject).toBe('Welcome to Atlas!');
  });

  it('should include the user email in the html output', () => {
    const html = template.html({ email: 'test@example.com' });
    expect(html).toContain('test@example.com');
  });

  it('should return a non-empty html string', () => {
    const html = template.html({ email: 'user@example.com' });
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern="welcome.template"
```

Expected: FAIL with `Cannot find module './welcome.template'`.

- [ ] **Step 4: Implement WelcomeEmailTemplate**

Create `apps/notification-service/src/email/templates/welcome.template.ts`:

```typescript
import { EmailTemplate } from '../email-template.interface';

export class WelcomeEmailTemplate implements EmailTemplate {
  subject = 'Welcome to Atlas!';

  html(data: { email: string }): string {
    return `
      <h1>Welcome to Atlas!</h1>
      <p>Hi ${data.email},</p>
      <p>Your account has been successfully created. We're glad to have you on board.</p>
      <p>— The Atlas Team</p>
    `;
  }
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern="welcome.template"
```

Expected: PASS — 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/notification-service/src/email/
git commit -m "feat(notification-service): add EmailTemplate interface and WelcomeEmailTemplate"
```

---

## Task 4: EmailService (TDD)

- [ ] **Step 1: Write the failing test**

Create `apps/notification-service/src/email/email.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';
import { WelcomeEmailTemplate } from './templates/welcome.template';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  const mockSendMail = jest.fn();

  beforeEach(async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call sendMail with the correct to, subject from the template', async () => {
    const template = new WelcomeEmailTemplate();

    await service.sendMail('user@example.com', template);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Welcome to Atlas!',
      }),
    );
  });

  it('should not throw when the SMTP transport fails', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));
    const template = new WelcomeEmailTemplate();

    await expect(service.sendMail('user@example.com', template)).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern="email.service"
```

Expected: FAIL with `Cannot find module './email.service'`.

- [ ] **Step 3: Implement EmailService**

Create `apps/notification-service/src/email/email.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailTemplate } from './email-template.interface';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(to: string, template: EmailTemplate): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: template.subject,
        html: template.html({ email: to }),
      });
      console.log(`[Email] Sent "${template.subject}" to ${to}`);
    } catch (error) {
      console.error(`[Email] Failed to send to ${to}:`, error);
    }
  }
}
```

- [ ] **Step 4: Create EmailModule**

Create `apps/notification-service/src/email/email.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern="email.service"
```

Expected: PASS — 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/notification-service/src/email/email.service.ts \
        apps/notification-service/src/email/email.service.spec.ts \
        apps/notification-service/src/email/email.module.ts
git commit -m "feat(notification-service): add EmailService with Nodemailer SMTP transport"
```

---

## Task 5: NotificationService (TDD)

- [ ] **Step 1: Write the failing test**

Create `apps/notification-service/src/notification/notification.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { EmailService } from '../email/email.service';
import { UserCreatedEvent } from '@app/contracts';

describe('NotificationService', () => {
  let service: NotificationService;
  const mockEmailService = { sendMail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUserCreated', () => {
    it('should call emailService.sendMail with the user email', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-123',
        email: 'newuser@example.com',
        createdAt: new Date(),
      };

      await service.handleUserCreated(event);

      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        'newuser@example.com',
        expect.objectContaining({ subject: 'Welcome to Atlas!' }),
      );
    });

    it('should call emailService.sendMail exactly once per event', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-456',
        email: 'another@example.com',
        createdAt: new Date(),
      };

      await service.handleUserCreated(event);

      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern="notification.service"
```

Expected: FAIL with `Cannot find module './notification.service'`.

- [ ] **Step 3: Implement NotificationService**

Create `apps/notification-service/src/notification/notification.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { USER_CREATED_EVENT, UserCreatedEvent } from '@app/contracts';
import { EmailService } from '../email/email.service';
import { WelcomeEmailTemplate } from '../email/templates/welcome.template';

@Injectable()
export class NotificationService {
  constructor(private readonly emailService: EmailService) {}

  @EventPattern(USER_CREATED_EVENT)
  async handleUserCreated(@Payload() event: UserCreatedEvent): Promise<void> {
    console.log(`[Notification] Received ${USER_CREATED_EVENT}`, {
      userId: event.userId,
      email: event.email,
    });
    await this.emailService.sendMail(event.email, new WelcomeEmailTemplate());
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern="notification.service"
```

Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/notification-service/src/notification/
git commit -m "feat(notification-service): add NotificationService with user.created handler"
```

---

## Task 6: Bootstrap notification-service app

- [ ] **Step 1: Create the root module**

Create `apps/notification-service/src/notification.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { NotificationService } from './notification/notification.service';

@Module({
  imports: [EmailModule],
  providers: [NotificationService],
})
export class NotificationModule {}
```

- [ ] **Step 2: Create main.ts**

Create `apps/notification-service/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
        queue: 'notification_queue',
        queueOptions: { durable: true },
        socketOptions: { heartbeatIntervalInSeconds: 5 },
      },
    },
  );
  await app.listen();
  console.log('[Notification Service] Listening on notification_queue');
}
bootstrap();
```

- [ ] **Step 3: Verify the build compiles cleanly**

```bash
pnpm run build:notification
```

Expected: exits 0, no TypeScript errors. Output in `dist/apps/notification-service/`.

- [ ] **Step 4: Commit**

```bash
git add apps/notification-service/src/main.ts \
        apps/notification-service/src/notification.module.ts
git commit -m "feat(notification-service): bootstrap NestJS microservice with RabbitMQ transport"
```

---

## Task 7: Update auth-service to publish user.created via RabbitMQ

- [ ] **Step 1: Write the failing test**

Create `apps/auth-service/src/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { USER_CREATED_EVENT } from '@app/contracts';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockNotificationClient = {
    emit: jest.fn(),
  };

  const createdUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date('2026-04-08'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: 'NOTIFICATION_SERVICE', useValue: mockNotificationClient },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = { email: 'test@example.com', password: 'password123' };

    it('should return accessToken and refreshToken on success', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.register(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should emit user.created event with correct payload after registration', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      await service.register(dto);

      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        USER_CREATED_EVENT,
        expect.objectContaining({
          userId: 'user-id-123',
          email: 'test@example.com',
        }),
      );
    });

    it('should throw ConflictException and not emit event if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(createdUser);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockNotificationClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for unknown email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern="auth.service"
```

Expected: FAIL — `AuthService` constructor doesn't accept `NOTIFICATION_SERVICE` yet.

- [ ] **Step 3: Update auth.module.ts**

Replace the entire contents of `apps/auth-service/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    ClientsModule.register([
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
          queue: 'notification_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService],
})
export class AuthModule {}
```

- [ ] **Step 4: Update auth.service.ts**

Replace the entire contents of `apps/auth-service/src/auth/auth.service.ts`:

```typescript
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { USER_CREATED_EVENT, UserCreatedEvent } from '@app/contracts';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
    });

    const event: UserCreatedEvent = {
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
    this.notificationClient.emit(USER_CREATED_EVENT, event);

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        refreshToken,
        { secret: process.env.JWT_REFRESH_SECRET },
      );
      return this.issueTokens(payload.sub, payload.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private issueTokens(userId: string, email: string): TokenPair {
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: 60 * 15,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: 60 * 60 * 24 * 7,
    });
    return { accessToken, refreshToken };
  }
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern="auth.service"
```

Expected: PASS — 4 tests pass.

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
pnpm test
```

Expected: all existing tests continue to pass.

- [ ] **Step 7: Commit**

```bash
git add apps/auth-service/src/auth/auth.module.ts \
        apps/auth-service/src/auth/auth.service.ts \
        apps/auth-service/src/auth/auth.service.spec.ts
git commit -m "feat(auth-service): publish user.created event to RabbitMQ via ClientProxy"
```

---

## Task 8: Add RabbitMQ and notification-service to Docker Compose

- [ ] **Step 1: Add rabbitmq and notification-service to docker-compose.yml**

Replace the contents of `docker-compose.yml` with:

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: atlas-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: atlas-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  gateway:
    build: .
    container_name: atlas-gateway
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    command: pnpm run start:gateway
    environment:
      GATEWAY_PORT: 3000
      AUTH_SERVICE_URL: http://auth-service:3001
      CONTENT_SERVICE_URL: http://content-service:3002
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    depends_on:
      - auth-service
      - content-service

  auth-service:
    build: .
    container_name: atlas-auth-service
    ports:
      - "3001:3001"
    volumes:
      - .:/app
      - /app/node_modules
    command: pnpm run start:auth
    environment:
      AUTH_SERVICE_PORT: 3001
      DATABASE_URL: ${DATABASE_URL}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      RABBITMQ_URL: ${RABBITMQ_URL}
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  content-service:
    build: .
    container_name: atlas-content-service
    ports:
      - "3002:3002"
    volumes:
      - .:/app
      - /app/node_modules
    command: pnpm run start:content
    environment:
      CONTENT_SERVICE_PORT: 3002
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      postgres:
        condition: service_healthy

  notification-service:
    build: .
    container_name: atlas-notification-service
    volumes:
      - .:/app
      - /app/node_modules
    command: pnpm run start:notification
    environment:
      RABBITMQ_URL: ${RABBITMQ_URL}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM: ${SMTP_FROM}
    depends_on:
      rabbitmq:
        condition: service_healthy

volumes:
  postgres_data:
```

- [ ] **Step 2: Add new env vars to .env**

Append to your local `.env` file (this file is not committed):

```env
# RabbitMQ
RABBITMQ_URL="amqp://<user>:<password>@localhost:5672"

# SMTP (notification-service)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="<your-smtp-user>"
SMTP_PASS="<your-app-password>"
SMTP_FROM="Atlas <<your-email>>"
```

> **Note for Gmail:** Use an App Password (Google Account → Security → 2-Step Verification → App Passwords), not your account password.

- [ ] **Step 3: Commit docker-compose changes**

```bash
git add docker-compose.yml
git commit -m "chore: add rabbitmq and notification-service to Docker Compose"
```

---

## Verification

After all tasks are complete, verify end-to-end:

```bash
# 1. Start all services
docker compose up --build

# 2. Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "hello@example.com", "password": "password123"}'

# 3. Check notification-service logs for the event and email send
docker logs atlas-notification-service
# Expected output:
# [Notification Service] Listening on notification_queue
# [Notification] Received user.created { userId: '...', email: 'hello@example.com' }
# [Email] Sent "Welcome to Atlas!" to hello@example.com
```
