# URL Shortener Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `url-shortener` NestJS microservice on port 3003 that lets authenticated users create/list/delete expiring short links with click tracking, and anyone can follow a short link via a public redirect.

**Architecture:** New `apps/url-shortener/` HTTP service using Prisma (shared Postgres instance) with `ShortLink` and `ClickEvent` models. The API Gateway grows a `UrlShortenerModule` proxy following the same `HttpService`-based pattern used by `content/` and `dummy/`. Authenticated routes (`/links/*`) forward `x-user-id` header; the public redirect (`/s/:slug`) bypasses JWT guard on the gateway and receives the 302 from the url-shortener, which the gateway re-issues to the client.

**Tech Stack:** NestJS 11, Prisma v7 + `@prisma/adapter-pg`, `@nestjs/schedule` (cron cleanup), `class-validator`, `crypto` (built-in Node — no extra dep for slug generation), `@nestjs/axios` (existing).

---

## File Map

### New files — `apps/url-shortener/`
| File | Purpose |
|------|---------|
| `tsconfig.app.json` | TS config for this app |
| `src/main.ts` | Bootstrap HTTP on `URL_SHORTENER_PORT` |
| `src/app.module.ts` | Root module — imports LinksModule, RedirectModule, ScheduleModule |
| `src/app.controller.ts` | `GET /` health check → `{ status: 'ok' }` |
| `src/app.controller.spec.ts` | Health check test |
| `src/prisma/prisma.service.ts` | PrismaService (copy of auth-service pattern) |
| `src/links/dto/create-link.dto.ts` | `CreateLinkDto` with validation |
| `src/links/links.service.ts` | create, findAllByUser, delete, resolveAndTrack |
| `src/links/links.service.spec.ts` | Unit tests for LinksService |
| `src/links/links.controller.ts` | `POST /links`, `GET /links`, `DELETE /links/:slug` |
| `src/links/links.controller.spec.ts` | Unit tests for LinksController |
| `src/links/cleanup.service.ts` | `@Cron` nightly delete of expired links |
| `src/links/cleanup.service.spec.ts` | Unit test for CleanupService |
| `src/links/links.module.ts` | Wires LinksController, LinksService, CleanupService, PrismaService |
| `src/redirect/redirect.controller.ts` | `GET /s/:slug` — count click + 302 redirect |
| `src/redirect/redirect.controller.spec.ts` | Unit tests for RedirectController |
| `src/redirect/redirect.module.ts` | Wires RedirectController, imports LinksModule |

### New files — `apps/gateway/src/url-shortener/`
| File | Purpose |
|------|---------|
| `url-shortener-proxy.service.ts` | createLink, getMyLinks, deleteLink, resolveSlug |
| `url-shortener-proxy.service.spec.ts` | Unit tests for proxy service |
| `url-shortener-proxy.controller.ts` | `/links/*` with JwtAuthGuard |
| `url-shortener-proxy.controller.spec.ts` | Unit tests for proxy controller |
| `url-shortener-redirect.controller.ts` | `GET /s/:slug` — public, no guard, re-redirects |
| `url-shortener-redirect.controller.spec.ts` | Unit test for redirect controller |
| `url-shortener.module.ts` | Wires all gateway url-shortener pieces |

### Modified files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ShortLink` and `ClickEvent` models |
| `nest-cli.json` | Register `url-shortener` app |
| `package.json` | Add `start:url-shortener`, `build:url-shortener` scripts |
| `docker-compose.yml` | Add `url-shortener` service + env var to gateway |
| `apps/gateway/src/app.module.ts` | Import `UrlShortenerModule` |

---

## Task 1: Package install + monorepo scaffolding

**Files:**
- Modify: `package.json`
- Modify: `nest-cli.json`
- Create: `apps/url-shortener/tsconfig.app.json`

- [ ] **Step 1: Install `@nestjs/schedule`**

```bash
pnpm add @nestjs/schedule
```

Expected: `@nestjs/schedule` appears in `package.json` dependencies.

- [ ] **Step 2: Add `url-shortener` scripts to `package.json`**

In `package.json`, inside the `"scripts"` block, add after the `build:content` line:

```json
"build:url-shortener": "nest build url-shortener",
```

And after `start:content`:

```json
"start:url-shortener": "nest start url-shortener --watch",
```

And after `start:prod:content`:

```json
"start:prod:url-shortener": "node dist/apps/url-shortener/main",
```

- [ ] **Step 3: Register `url-shortener` in `nest-cli.json`**

In `nest-cli.json`, add inside `"projects"` after the `content-service` entry:

```json
"url-shortener": {
  "type": "application",
  "root": "apps/url-shortener",
  "entryFile": "main",
  "sourceRoot": "apps/url-shortener/src",
  "compilerOptions": {
    "tsConfigPath": "apps/url-shortener/tsconfig.app.json"
  }
}
```

- [ ] **Step 4: Create `apps/url-shortener/tsconfig.app.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/url-shortener"
  },
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json nest-cli.json apps/url-shortener/tsconfig.app.json
git commit -m "chore(url-shortener): scaffold monorepo registration and install schedule package"
```

---

## Task 2: Prisma schema — add ShortLink and ClickEvent models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add models to `prisma/schema.prisma`**

At the end of `prisma/schema.prisma`, append:

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

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_short_links
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: No errors. `@prisma/client` now includes `shortLink` and `clickEvent` on the client.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "chore(prisma): add ShortLink and ClickEvent models"
```

---

## Task 3: PrismaService + App bootstrap

**Files:**
- Create: `apps/url-shortener/src/prisma/prisma.service.ts`
- Create: `apps/url-shortener/src/app.controller.spec.ts`
- Create: `apps/url-shortener/src/app.controller.ts`
- Create: `apps/url-shortener/src/app.module.ts`
- Create: `apps/url-shortener/src/main.ts`

- [ ] **Step 1: Create PrismaService**

Create `apps/url-shortener/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: Write the failing health check test**

Create `apps/url-shortener/src/app.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return { status: "ok" }', () => {
      expect(controller.getHealth()).toEqual({ status: 'ok' });
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=url-shortener/src/app.controller
```

Expected: FAIL — `Cannot find module './app.controller'`

- [ ] **Step 4: Implement AppController**

Create `apps/url-shortener/src/app.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=url-shortener/src/app.controller
```

Expected: PASS

- [ ] **Step 6: Create AppModule (placeholder — will grow as modules are added)**

Create `apps/url-shortener/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 7: Create main.ts**

Create `apps/url-shortener/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.URL_SHORTENER_PORT ?? 3003);
}
bootstrap();
```

- [ ] **Step 8: Commit**

```bash
git add apps/url-shortener/
git commit -m "feat(url-shortener): add PrismaService and app bootstrap"
```

---

## Task 4: LinksService (TDD)

**Files:**
- Create: `apps/url-shortener/src/links/dto/create-link.dto.ts`
- Create: `apps/url-shortener/src/links/links.service.spec.ts`
- Create: `apps/url-shortener/src/links/links.service.ts`

- [ ] **Step 1: Create CreateLinkDto**

Create `apps/url-shortener/src/links/dto/create-link.dto.ts`:

```typescript
import { IsUrl, IsOptional, IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class CreateLinkDto {
  @IsUrl({}, { message: 'targetUrl must be a valid URL' })
  targetUrl: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'Slug must be 3–50 alphanumeric/hyphen characters',
  })
  @MinLength(3, { message: 'Slug must be 3–50 alphanumeric/hyphen characters' })
  @MaxLength(50, { message: 'Slug must be 3–50 alphanumeric/hyphen characters' })
  slug?: string;
}
```

- [ ] **Step 2: Write the failing LinksService tests**

Create `apps/url-shortener/src/links/links.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LinksService } from './links.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LinksService', () => {
  let service: LinksService;
  let prisma: jest.Mocked<PrismaService>;

  const mockLink = {
    id: 'link-1',
    slug: 'abc123',
    targetUrl: 'https://example.com',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    _count: { clicks: 5 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        {
          provide: PrismaService,
          useValue: {
            shortLink: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
            },
            clickEvent: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a link with an auto-generated slug when none provided', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.shortLink.create as jest.Mock).mockResolvedValue(mockLink);

      const result = await service.create({ targetUrl: 'https://example.com' }, 'user-1');

      expect(prisma.shortLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            targetUrl: 'https://example.com',
            userId: 'user-1',
          }),
        }),
      );
      expect(result).toMatchObject({
        targetUrl: 'https://example.com',
        clickCount: 5,
      });
    });

    it('should create a link with a custom slug when provided', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.shortLink.create as jest.Mock).mockResolvedValue(mockLink);

      await service.create({ targetUrl: 'https://example.com', slug: 'my-brand' }, 'user-1');

      expect(prisma.shortLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'my-brand' }),
        }),
      );
    });

    it('should throw ConflictException when custom slug is already taken', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(mockLink);

      await expect(
        service.create({ targetUrl: 'https://example.com', slug: 'taken' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllByUser', () => {
    it('should return all links for the given userId with clickCount', async () => {
      (prisma.shortLink.findMany as jest.Mock).mockResolvedValue([mockLink]);

      const result = await service.findAllByUser('user-1');

      expect(prisma.shortLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ slug: 'abc123', clickCount: 5 });
    });

    it('should not return links belonging to other users', async () => {
      (prisma.shortLink.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllByUser('other-user');
      expect(result).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete the link when user owns it', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(mockLink);

      await service.delete('abc123', 'user-1');

      expect(prisma.shortLink.delete).toHaveBeenCalledWith({ where: { slug: 'abc123' } });
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the link', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(mockLink);

      await expect(service.delete('abc123', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resolveAndTrack', () => {
    it('should insert a click event and return targetUrl for a valid link', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(mockLink);
      (prisma.clickEvent.create as jest.Mock).mockResolvedValue({});

      const result = await service.resolveAndTrack('abc123');

      expect(prisma.clickEvent.create).toHaveBeenCalledWith({
        data: { shortLinkId: 'link-1' },
      });
      expect(result).toBe('https://example.com');
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resolveAndTrack('missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw GoneException when link is expired', async () => {
      const expiredLink = { ...mockLink, expiresAt: new Date(Date.now() - 1000) };
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(expiredLink);

      await expect(service.resolveAndTrack('abc123')).rejects.toThrow(
        expect.objectContaining({ status: 410 }),
      );
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=url-shortener/src/links/links.service
```

Expected: FAIL — `Cannot find module './links.service'`

- [ ] **Step 4: Implement LinksService**

Create `apps/url-shortener/src/links/links.service.ts`:

```typescript
import {
  Injectable,
  ConflictException,
  ForbiddenException,
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

interface ShortLinkResponse {
  slug: string;
  targetUrl: string;
  expiresAt: Date;
  createdAt: Date;
  clickCount: number;
}

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLinkDto, userId: string): Promise<ShortLinkResponse> {
    const slug = dto.slug ?? (await this.generateUniqueSlug());

    if (dto.slug) {
      const existing = await this.prisma.shortLink.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException('Slug already in use');
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const link = await this.prisma.shortLink.create({
      data: { slug, targetUrl: dto.targetUrl, userId, expiresAt },
      include: { _count: { select: { clicks: true } } },
    });

    return this.toResponse(link, link._count.clicks);
  }

  async findAllByUser(userId: string): Promise<ShortLinkResponse[]> {
    const links = await this.prisma.shortLink.findMany({
      where: { userId },
      include: { _count: { select: { clicks: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return links.map(link => this.toResponse(link, link._count.clicks));
  }

  async delete(slug: string, userId: string): Promise<void> {
    const link = await this.prisma.shortLink.findUnique({ where: { slug } });
    if (!link) throw new NotFoundException('Short link not found');
    if (link.userId !== userId) throw new ForbiddenException();
    await this.prisma.shortLink.delete({ where: { slug } });
  }

  async resolveAndTrack(slug: string): Promise<string> {
    const link = await this.prisma.shortLink.findUnique({ where: { slug } });
    if (!link) throw new NotFoundException('Short link not found');
    if (link.expiresAt < new Date()) throw new GoneException('Link has expired');
    await this.prisma.clickEvent.create({ data: { shortLinkId: link.id } });
    return link.targetUrl;
  }

  private async generateUniqueSlug(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const slug = this.generateSlug();
      const existing = await this.prisma.shortLink.findUnique({ where: { slug } });
      if (!existing) return slug;
    }
    throw new InternalServerErrorException('Failed to generate unique slug');
  }

  private generateSlug(): string {
    return Array.from(randomBytes(6))
      .map(b => CHARS[b % CHARS.length])
      .join('');
  }

  private toResponse(link: any, clickCount: number): ShortLinkResponse {
    return {
      slug: link.slug,
      targetUrl: link.targetUrl,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      clickCount,
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=url-shortener/src/links/links.service
```

Expected: PASS — all 8 tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/url-shortener/src/links/
git commit -m "feat(url-shortener): add LinksService with TDD"
```

---

## Task 5: LinksController (TDD)

**Files:**
- Create: `apps/url-shortener/src/links/links.controller.spec.ts`
- Create: `apps/url-shortener/src/links/links.controller.ts`
- Create: `apps/url-shortener/src/links/links.module.ts`
- Modify: `apps/url-shortener/src/app.module.ts`

- [ ] **Step 1: Write the failing LinksController tests**

Create `apps/url-shortener/src/links/links.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

describe('LinksController', () => {
  let controller: LinksController;
  let service: jest.Mocked<LinksService>;

  const mockLink = {
    slug: 'abc123',
    targetUrl: 'https://example.com',
    expiresAt: new Date(),
    createdAt: new Date(),
    clickCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinksController],
      providers: [
        {
          provide: LinksService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockLink),
            findAllByUser: jest.fn().mockResolvedValue([mockLink]),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<LinksController>(LinksController);
    service = module.get(LinksService);
  });

  describe('create', () => {
    it('should call LinksService.create with dto and userId from header', async () => {
      const dto = { targetUrl: 'https://example.com' };
      const result = await controller.create(dto as any, 'user-1');

      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(mockLink);
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(controller.create({ targetUrl: 'https://example.com' } as any, '')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findAll', () => {
    it('should call LinksService.findAllByUser with userId from header', async () => {
      const result = await controller.findAll('user-1');

      expect(service.findAllByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([mockLink]);
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(controller.findAll('')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('delete', () => {
    it('should call LinksService.delete with slug and userId from header', async () => {
      await controller.delete('abc123', 'user-1');

      expect(service.delete).toHaveBeenCalledWith('abc123', 'user-1');
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(controller.delete('abc123', '')).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=url-shortener/src/links/links.controller
```

Expected: FAIL — `Cannot find module './links.controller'`

- [ ] **Step 3: Implement LinksController**

Create `apps/url-shortener/src/links/links.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';

@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  create(@Body() dto: CreateLinkDto, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.create(dto, userId);
  }

  @Get()
  findAll(@Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.findAllByUser(userId);
  }

  @Delete(':slug')
  delete(@Param('slug') slug: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.delete(slug, userId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=url-shortener/src/links/links.controller
```

Expected: PASS

- [ ] **Step 5: Create LinksModule**

Create `apps/url-shortener/src/links/links.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LinksController],
  providers: [LinksService, PrismaService],
  exports: [LinksService],
})
export class LinksModule {}
```

- [ ] **Step 6: Register LinksModule in AppModule**

Replace `apps/url-shortener/src/app.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LinksModule } from './links/links.module';

@Module({
  imports: [LinksModule],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 7: Run all url-shortener tests so far**

```bash
pnpm test -- --testPathPattern=apps/url-shortener
```

Expected: PASS — all tests green.

- [ ] **Step 8: Commit**

```bash
git add apps/url-shortener/src/links/links.controller.ts \
        apps/url-shortener/src/links/links.controller.spec.ts \
        apps/url-shortener/src/links/links.module.ts \
        apps/url-shortener/src/app.module.ts
git commit -m "feat(url-shortener): add LinksController and LinksModule"
```

---

## Task 6: CleanupService (TDD)

**Files:**
- Create: `apps/url-shortener/src/links/cleanup.service.spec.ts`
- Create: `apps/url-shortener/src/links/cleanup.service.ts`
- Modify: `apps/url-shortener/src/links/links.module.ts`
- Modify: `apps/url-shortener/src/app.module.ts`

- [ ] **Step 1: Write the failing CleanupService test**

Create `apps/url-shortener/src/links/cleanup.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CleanupService', () => {
  let service: CleanupService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        {
          provide: PrismaService,
          useValue: {
            shortLink: {
              deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
    prisma = module.get(PrismaService);
  });

  describe('deleteExpiredLinks', () => {
    it('should delete all ShortLink rows where expiresAt is in the past', async () => {
      await service.deleteExpiredLinks();

      expect(prisma.shortLink.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=url-shortener/src/links/cleanup.service
```

Expected: FAIL — `Cannot find module './cleanup.service'`

- [ ] **Step 3: Implement CleanupService**

Create `apps/url-shortener/src/links/cleanup.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *')
  async deleteExpiredLinks(): Promise<void> {
    await this.prisma.shortLink.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=url-shortener/src/links/cleanup.service
```

Expected: PASS

- [ ] **Step 5: Add CleanupService to LinksModule**

Replace `apps/url-shortener/src/links/links.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LinksController],
  providers: [LinksService, CleanupService, PrismaService],
  exports: [LinksService],
})
export class LinksModule {}
```

- [ ] **Step 6: Add ScheduleModule.forRoot() to AppModule**

Replace `apps/url-shortener/src/app.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { LinksModule } from './links/links.module';

@Module({
  imports: [ScheduleModule.forRoot(), LinksModule],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 7: Run all url-shortener tests**

```bash
pnpm test -- --testPathPattern=apps/url-shortener
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/url-shortener/src/links/cleanup.service.ts \
        apps/url-shortener/src/links/cleanup.service.spec.ts \
        apps/url-shortener/src/links/links.module.ts \
        apps/url-shortener/src/app.module.ts
git commit -m "feat(url-shortener): add CleanupService with nightly cron job"
```

---

## Task 7: RedirectModule (TDD)

**Files:**
- Create: `apps/url-shortener/src/redirect/redirect.controller.spec.ts`
- Create: `apps/url-shortener/src/redirect/redirect.controller.ts`
- Create: `apps/url-shortener/src/redirect/redirect.module.ts`
- Modify: `apps/url-shortener/src/app.module.ts`

- [ ] **Step 1: Write the failing RedirectController test**

Create `apps/url-shortener/src/redirect/redirect.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, GoneException } from '@nestjs/common';
import { RedirectController } from './redirect.controller';
import { LinksService } from '../links/links.service';

describe('RedirectController', () => {
  let controller: RedirectController;
  let service: jest.Mocked<LinksService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedirectController],
      providers: [
        {
          provide: LinksService,
          useValue: {
            resolveAndTrack: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RedirectController>(RedirectController);
    service = module.get(LinksService);
  });

  describe('redirect', () => {
    it('should return redirect object with targetUrl when link is valid', async () => {
      service.resolveAndTrack.mockResolvedValue('https://example.com');

      const result = await controller.redirect('abc123');

      expect(service.resolveAndTrack).toHaveBeenCalledWith('abc123');
      expect(result).toEqual({ url: 'https://example.com', statusCode: 302 });
    });

    it('should propagate NotFoundException when slug does not exist', async () => {
      service.resolveAndTrack.mockRejectedValue(new NotFoundException('Short link not found'));

      await expect(controller.redirect('missing')).rejects.toThrow(NotFoundException);
    });

    it('should propagate GoneException when link is expired', async () => {
      service.resolveAndTrack.mockRejectedValue(new GoneException('Link has expired'));

      await expect(controller.redirect('expired')).rejects.toThrow(GoneException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=url-shortener/src/redirect/redirect.controller
```

Expected: FAIL — `Cannot find module './redirect.controller'`

- [ ] **Step 3: Implement RedirectController**

Create `apps/url-shortener/src/redirect/redirect.controller.ts`:

```typescript
import { Controller, Get, Param, Redirect } from '@nestjs/common';
import { LinksService } from '../links/links.service';

@Controller('s')
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':slug')
  @Redirect()
  async redirect(@Param('slug') slug: string) {
    const url = await this.linksService.resolveAndTrack(slug);
    return { url, statusCode: 302 };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=url-shortener/src/redirect/redirect.controller
```

Expected: PASS

- [ ] **Step 5: Create RedirectModule**

Create `apps/url-shortener/src/redirect/redirect.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { RedirectController } from './redirect.controller';
import { LinksModule } from '../links/links.module';

@Module({
  imports: [LinksModule],
  controllers: [RedirectController],
})
export class RedirectModule {}
```

- [ ] **Step 6: Register RedirectModule in AppModule**

Replace `apps/url-shortener/src/app.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { LinksModule } from './links/links.module';
import { RedirectModule } from './redirect/redirect.module';

@Module({
  imports: [ScheduleModule.forRoot(), LinksModule, RedirectModule],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 7: Run all url-shortener tests**

```bash
pnpm test -- --testPathPattern=apps/url-shortener
```

Expected: PASS — all tests green.

- [ ] **Step 8: Commit**

```bash
git add apps/url-shortener/src/redirect/ apps/url-shortener/src/app.module.ts
git commit -m "feat(url-shortener): add RedirectController and RedirectModule"
```

---

## Task 8: Gateway UrlShortenerProxy (TDD)

**Files:**
- Create: `apps/gateway/src/url-shortener/url-shortener-proxy.service.spec.ts`
- Create: `apps/gateway/src/url-shortener/url-shortener-proxy.service.ts`
- Create: `apps/gateway/src/url-shortener/url-shortener-proxy.controller.spec.ts`
- Create: `apps/gateway/src/url-shortener/url-shortener-proxy.controller.ts`
- Create: `apps/gateway/src/url-shortener/url-shortener-redirect.controller.spec.ts`
- Create: `apps/gateway/src/url-shortener/url-shortener-redirect.controller.ts`
- Create: `apps/gateway/src/url-shortener/url-shortener.module.ts`
- Modify: `apps/gateway/src/app.module.ts`

- [ ] **Step 1: Write the failing proxy service test**

Create `apps/gateway/src/url-shortener/url-shortener-proxy.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { NotFoundException, GoneException } from '@nestjs/common';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('UrlShortenerProxyService', () => {
  let service: UrlShortenerProxyService;
  let httpService: HttpService;

  const mockLink = {
    slug: 'abc123',
    targetUrl: 'https://example.com',
    expiresAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-04-08T00:00:00.000Z',
    clickCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlShortenerProxyService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UrlShortenerProxyService>(UrlShortenerProxyService);
    httpService = module.get<HttpService>(HttpService);
  });

  const okResponse = (data: unknown): AxiosResponse =>
    ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as any });

  describe('createLink', () => {
    it('should POST to /links with x-user-id header and return data', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of(okResponse(mockLink)));

      const result = await service.createLink({ targetUrl: 'https://example.com' }, 'user-1');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/links'),
        { targetUrl: 'https://example.com' },
        expect.objectContaining({ headers: { 'x-user-id': 'user-1' } }),
      );
      expect(result).toEqual(mockLink);
    });
  });

  describe('getMyLinks', () => {
    it('should GET /links with x-user-id header and return data', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(of(okResponse([mockLink])));

      const result = await service.getMyLinks('user-1');

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/links'),
        expect.objectContaining({ headers: { 'x-user-id': 'user-1' } }),
      );
      expect(result).toEqual([mockLink]);
    });
  });

  describe('deleteLink', () => {
    it('should DELETE /links/:slug with x-user-id header and return data', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(of(okResponse(null)));

      await service.deleteLink('abc123', 'user-1');

      expect(httpService.delete).toHaveBeenCalledWith(
        expect.stringContaining('/links/abc123'),
        expect.objectContaining({ headers: { 'x-user-id': 'user-1' } }),
      );
    });
  });

  describe('resolveSlug', () => {
    it('should GET /s/:slug and return the Location header on 302', async () => {
      const redirectResponse: AxiosResponse = {
        data: null,
        status: 302,
        statusText: 'Found',
        headers: { location: 'https://example.com' },
        config: {} as any,
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(redirectResponse));

      const result = await service.resolveSlug('abc123');

      expect(result).toBe('https://example.com');
    });

    it('should throw NotFoundException when url-shortener returns 404', async () => {
      const notFoundResponse: AxiosResponse = {
        data: null,
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(notFoundResponse));

      await expect(service.resolveSlug('missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw GoneException when url-shortener returns 410', async () => {
      const goneResponse: AxiosResponse = {
        data: null,
        status: 410,
        statusText: 'Gone',
        headers: {},
        config: {} as any,
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(goneResponse));

      await expect(service.resolveSlug('expired')).rejects.toThrow(GoneException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=gateway/src/url-shortener/url-shortener-proxy.service
```

Expected: FAIL — `Cannot find module './url-shortener-proxy.service'`

- [ ] **Step 3: Implement UrlShortenerProxyService**

Create `apps/gateway/src/url-shortener/url-shortener-proxy.service.ts`:

```typescript
import {
  Injectable,
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UrlShortenerProxyService {
  private readonly urlShortenerUrl =
    process.env.URL_SHORTENER_URL ?? 'http://localhost:3003';

  constructor(private readonly http: HttpService) {}

  async createLink(body: unknown, userId: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.urlShortenerUrl}/links`, body, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }

  async getMyLinks(userId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.urlShortenerUrl}/links`, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }

  async deleteLink(slug: string, userId: string) {
    const { data } = await firstValueFrom(
      this.http.delete(`${this.urlShortenerUrl}/links/${slug}`, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }

  async resolveSlug(slug: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get(`${this.urlShortenerUrl}/s/${slug}`, {
        maxRedirects: 0,
        validateStatus: s => s === 302 || (s >= 400 && s < 600),
      }),
    );
    if (response.status === 302) return response.headers.location as string;
    if (response.status === 404) throw new NotFoundException('Short link not found');
    if (response.status === 410) throw new GoneException('Link has expired');
    throw new InternalServerErrorException();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=gateway/src/url-shortener/url-shortener-proxy.service
```

Expected: PASS

- [ ] **Step 5: Write the failing proxy controller test**

Create `apps/gateway/src/url-shortener/url-shortener-proxy.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UrlShortenerProxyController } from './url-shortener-proxy.controller';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';

describe('UrlShortenerProxyController', () => {
  let controller: UrlShortenerProxyController;
  let service: jest.Mocked<UrlShortenerProxyService>;

  const mockLink = {
    slug: 'abc123',
    targetUrl: 'https://example.com',
    expiresAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-04-08T00:00:00.000Z',
    clickCount: 0,
  };

  const mockReq = { user: { userId: 'user-1', email: 'test@example.com' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlShortenerProxyController],
      providers: [
        {
          provide: UrlShortenerProxyService,
          useValue: {
            createLink: jest.fn().mockResolvedValue(mockLink),
            getMyLinks: jest.fn().mockResolvedValue([mockLink]),
            deleteLink: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<UrlShortenerProxyController>(UrlShortenerProxyController);
    service = module.get(UrlShortenerProxyService);
  });

  describe('create', () => {
    it('should call createLink with body and userId from request', async () => {
      const body = { targetUrl: 'https://example.com' };
      const result = await controller.create(body, mockReq as any);

      expect(service.createLink).toHaveBeenCalledWith(body, 'user-1');
      expect(result).toEqual(mockLink);
    });
  });

  describe('getMyLinks', () => {
    it('should call getMyLinks with userId from request', async () => {
      const result = await controller.getMyLinks(mockReq as any);

      expect(service.getMyLinks).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([mockLink]);
    });
  });

  describe('deleteLink', () => {
    it('should call deleteLink with slug and userId from request', async () => {
      await controller.deleteLink('abc123', mockReq as any);

      expect(service.deleteLink).toHaveBeenCalledWith('abc123', 'user-1');
    });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=gateway/src/url-shortener/url-shortener-proxy.controller
```

Expected: FAIL — `Cannot find module './url-shortener-proxy.controller'`

- [ ] **Step 7: Implement UrlShortenerProxyController**

Create `apps/gateway/src/url-shortener/url-shortener-proxy.controller.ts`:

```typescript
import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('links')
@UseGuards(JwtAuthGuard)
export class UrlShortenerProxyController {
  constructor(private readonly proxy: UrlShortenerProxyService) {}

  @Post()
  create(@Body() body: unknown, @Request() req: AuthRequest) {
    return this.proxy.createLink(body, req.user.userId);
  }

  @Get()
  getMyLinks(@Request() req: AuthRequest) {
    return this.proxy.getMyLinks(req.user.userId);
  }

  @Delete(':slug')
  deleteLink(@Param('slug') slug: string, @Request() req: AuthRequest) {
    return this.proxy.deleteLink(slug, req.user.userId);
  }
}
```

- [ ] **Step 8: Write the failing redirect controller test**

Create `apps/gateway/src/url-shortener/url-shortener-redirect.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UrlShortenerRedirectController } from './url-shortener-redirect.controller';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';

describe('UrlShortenerRedirectController', () => {
  let controller: UrlShortenerRedirectController;
  let service: jest.Mocked<UrlShortenerProxyService>;

  const mockRes = {
    redirect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlShortenerRedirectController],
      providers: [
        {
          provide: UrlShortenerProxyService,
          useValue: {
            resolveSlug: jest.fn().mockResolvedValue('https://example.com'),
          },
        },
      ],
    }).compile();

    controller = module.get<UrlShortenerRedirectController>(UrlShortenerRedirectController);
    service = module.get(UrlShortenerProxyService);
    jest.clearAllMocks();
  });

  describe('redirect', () => {
    it('should call resolveSlug and redirect to the target URL', async () => {
      await controller.redirect('abc123', mockRes as any);

      expect(service.resolveSlug).toHaveBeenCalledWith('abc123');
      expect(mockRes.redirect).toHaveBeenCalledWith(302, 'https://example.com');
    });
  });
});
```

- [ ] **Step 9: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=gateway/src/url-shortener/url-shortener-redirect.controller
```

Expected: FAIL — `Cannot find module './url-shortener-redirect.controller'`

- [ ] **Step 10: Implement UrlShortenerRedirectController**

Create `apps/gateway/src/url-shortener/url-shortener-redirect.controller.ts`:

```typescript
import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';

@Controller('s')
export class UrlShortenerRedirectController {
  constructor(private readonly proxy: UrlShortenerProxyService) {}

  @Get(':slug')
  async redirect(@Param('slug') slug: string, @Res() res: Response) {
    const targetUrl = await this.proxy.resolveSlug(slug);
    return res.redirect(302, targetUrl);
  }
}
```

- [ ] **Step 11: Run redirect controller test to verify it passes**

```bash
pnpm test -- --testPathPattern=gateway/src/url-shortener/url-shortener-redirect.controller
```

Expected: PASS

- [ ] **Step 12: Create UrlShortenerModule**

Create `apps/gateway/src/url-shortener/url-shortener.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';
import { UrlShortenerProxyController } from './url-shortener-proxy.controller';
import { UrlShortenerRedirectController } from './url-shortener-redirect.controller';

@Module({
  imports: [HttpModule],
  controllers: [UrlShortenerProxyController, UrlShortenerRedirectController],
  providers: [UrlShortenerProxyService],
})
export class UrlShortenerModule {}
```

- [ ] **Step 13: Register UrlShortenerModule in gateway AppModule**

Replace `apps/gateway/src/app.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { DummyModule } from './dummy/dummy.module';
import { UrlShortenerModule } from './url-shortener/url-shortener.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AuthModule, ContentModule, DummyModule, UrlShortenerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 14: Run all gateway url-shortener tests**

```bash
pnpm test -- --testPathPattern=gateway/src/url-shortener
```

Expected: PASS — all 3 spec files green.

- [ ] **Step 15: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 16: Commit**

```bash
git add apps/gateway/src/url-shortener/ apps/gateway/src/app.module.ts
git commit -m "feat(gateway): add UrlShortenerModule proxying links and redirect routes"
```

---

## Task 9: Docker Compose + environment variables

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add `url-shortener` service to `docker-compose.yml`**

Add after the `content-service` block (before `volumes:`):

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

- [ ] **Step 2: Add `URL_SHORTENER_URL` to gateway's environment block in `docker-compose.yml`**

In the `gateway` service's `environment` block, add:

```yaml
      URL_SHORTENER_URL: http://url-shortener:3003
```

- [ ] **Step 3: Add gateway `depends_on` for url-shortener**

In the `gateway` service's `depends_on` block, add:

```yaml
      - url-shortener
```

- [ ] **Step 4: Verify the final `docker-compose.yml` gateway block looks like**

```yaml
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
      URL_SHORTENER_URL: http://url-shortener:3003
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    depends_on:
      - auth-service
      - content-service
      - url-shortener
```

- [ ] **Step 5: Document new env vars**

Add to `.env` (local development):

```env
URL_SHORTENER_PORT=3003
URL_SHORTENER_URL="http://localhost:3003"
```

- [ ] **Step 6: Run full test suite one final time**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env
git commit -m "feat(url-shortener): add Docker Compose service and environment configuration"
```
