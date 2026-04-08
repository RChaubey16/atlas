# Dummy Public Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /dummy/blogs` and `GET /dummy/users` as public (no-auth) endpoints routed via the gateway to the content service, returning hardcoded data.

**Architecture:** A `DummyModule` is added to the content service with a service holding hardcoded data and a controller exposing it. A matching `DummyModule` in the gateway proxies those two routes without any `JwtAuthGuard`. Both modules are registered in their respective `AppModule`.

**Tech Stack:** NestJS 11, TypeScript, `@nestjs/axios` (HttpService), Jest

---

## File Map

### Content Service — new files
- `apps/content-service/src/dummy/dummy.service.ts` — returns hardcoded blogs and users arrays
- `apps/content-service/src/dummy/dummy.controller.ts` — `@Controller('dummy')`, no auth headers required
- `apps/content-service/src/dummy/dummy.module.ts` — registers controller and service
- `apps/content-service/src/dummy/dummy.service.spec.ts` — unit tests for DummyService
- `apps/content-service/src/dummy/dummy.controller.spec.ts` — unit tests for DummyController

### Content Service — modified files
- `apps/content-service/src/app.module.ts` — import and register `DummyModule`

### Gateway — new files
- `apps/gateway/src/dummy/dummy-proxy.service.ts` — proxies GET /dummy/blogs and GET /dummy/users to content service
- `apps/gateway/src/dummy/dummy-proxy.controller.ts` — `@Controller('dummy')`, no `@UseGuards`
- `apps/gateway/src/dummy/dummy.module.ts` — registers controller and service, imports HttpModule
- `apps/gateway/src/dummy/dummy-proxy.service.spec.ts` — unit tests for DummyProxyService
- `apps/gateway/src/dummy/dummy-proxy.controller.spec.ts` — unit tests for DummyProxyController

### Gateway — modified files
- `apps/gateway/src/app.module.ts` — import and register `DummyModule`

---

## Task 1: DummyService in content service (TDD)

**Files:**
- Create: `apps/content-service/src/dummy/dummy.service.spec.ts`
- Create: `apps/content-service/src/dummy/dummy.service.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/content-service/src/dummy/dummy.service.spec.ts`:

```typescript
import { DummyService } from './dummy.service';

describe('DummyService', () => {
  let service: DummyService;

  beforeEach(() => {
    service = new DummyService();
  });

  describe('getBlogs', () => {
    it('should return an array of 5 blogs', () => {
      const blogs = service.getBlogs();
      expect(blogs).toHaveLength(5);
    });

    it('each blog should have id, title, body, author, createdAt', () => {
      const blogs = service.getBlogs();
      for (const blog of blogs) {
        expect(blog).toHaveProperty('id');
        expect(blog).toHaveProperty('title');
        expect(blog).toHaveProperty('body');
        expect(blog).toHaveProperty('author');
        expect(blog).toHaveProperty('createdAt');
      }
    });
  });

  describe('getUsers', () => {
    it('should return an array of 5 users', () => {
      const users = service.getUsers();
      expect(users).toHaveLength(5);
    });

    it('each user should have id, name, email, avatarUrl', () => {
      const users = service.getUsers();
      for (const user of users) {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('avatarUrl');
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --testPathPattern="dummy.service.spec"
```

Expected: FAIL with `Cannot find module './dummy.service'`

- [ ] **Step 3: Implement DummyService**

Create `apps/content-service/src/dummy/dummy.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

export interface Blog {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
}

export interface FakeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

@Injectable()
export class DummyService {
  getBlogs(): Blog[] {
    return [
      {
        id: '1',
        title: 'Getting Started with NestJS',
        body: 'NestJS is a progressive Node.js framework built with TypeScript. It provides an out-of-the-box application architecture that allows developers to create highly testable, scalable, and maintainable applications.',
        author: 'Jane Doe',
        createdAt: '2026-01-15T10:00:00.000Z',
      },
      {
        id: '2',
        title: 'Understanding Microservices',
        body: 'Microservices architecture breaks an application into small, independently deployable services. Each service is responsible for a specific business capability and communicates over well-defined APIs.',
        author: 'John Smith',
        createdAt: '2026-01-20T12:00:00.000Z',
      },
      {
        id: '3',
        title: 'JWT Authentication Deep Dive',
        body: 'JSON Web Tokens are a compact, URL-safe means of representing claims between two parties. They are commonly used for authentication and information exchange in web applications.',
        author: 'Alice Johnson',
        createdAt: '2026-02-01T09:00:00.000Z',
      },
      {
        id: '4',
        title: 'PostgreSQL Performance Tips',
        body: 'Proper indexing, query planning, and connection pooling are key to high-performance PostgreSQL. Understanding EXPLAIN ANALYZE output helps identify and fix slow queries.',
        author: 'Bob Williams',
        createdAt: '2026-02-10T14:00:00.000Z',
      },
      {
        id: '5',
        title: 'Docker Compose for Local Development',
        body: 'Docker Compose lets you define multi-container applications in a single YAML file. It is ideal for local development environments where you need databases, caches, and multiple services running together.',
        author: 'Carol Davis',
        createdAt: '2026-03-05T11:00:00.000Z',
      },
    ];
  }

  getUsers(): FakeUser[] {
    return [
      {
        id: '1',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
      },
      {
        id: '2',
        name: 'John Smith',
        email: 'john.smith@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=2',
      },
      {
        id: '3',
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=3',
      },
      {
        id: '4',
        name: 'Bob Williams',
        email: 'bob.williams@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=4',
      },
      {
        id: '5',
        name: 'Carol Davis',
        email: 'carol.davis@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=5',
      },
    ];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="dummy.service.spec"
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add apps/content-service/src/dummy/dummy.service.ts apps/content-service/src/dummy/dummy.service.spec.ts
git commit -m "feat(content): add DummyService with hardcoded blogs and users"
```

---

## Task 2: DummyController in content service (TDD)

**Files:**
- Create: `apps/content-service/src/dummy/dummy.controller.spec.ts`
- Create: `apps/content-service/src/dummy/dummy.controller.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/content-service/src/dummy/dummy.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DummyController } from './dummy.controller';
import { DummyService } from './dummy.service';

describe('DummyController', () => {
  let controller: DummyController;
  let service: DummyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DummyController],
      providers: [DummyService],
    }).compile();

    controller = module.get<DummyController>(DummyController);
    service = module.get<DummyService>(DummyService);
  });

  describe('getBlogs', () => {
    it('should return blogs from DummyService', () => {
      const blogs = controller.getBlogs();
      expect(blogs).toEqual(service.getBlogs());
      expect(blogs).toHaveLength(5);
    });
  });

  describe('getUsers', () => {
    it('should return users from DummyService', () => {
      const users = controller.getUsers();
      expect(users).toEqual(service.getUsers());
      expect(users).toHaveLength(5);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --testPathPattern="dummy.controller.spec"
```

Expected: FAIL with `Cannot find module './dummy.controller'`

- [ ] **Step 3: Implement DummyController**

Create `apps/content-service/src/dummy/dummy.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { DummyService, Blog, FakeUser } from './dummy.service';

@Controller('dummy')
export class DummyController {
  constructor(private readonly dummyService: DummyService) {}

  @Get('blogs')
  getBlogs(): Blog[] {
    return this.dummyService.getBlogs();
  }

  @Get('users')
  getUsers(): FakeUser[] {
    return this.dummyService.getUsers();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="dummy.controller.spec"
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add apps/content-service/src/dummy/dummy.controller.ts apps/content-service/src/dummy/dummy.controller.spec.ts
git commit -m "feat(content): add DummyController with GET /dummy/blogs and /dummy/users"
```

---

## Task 3: DummyModule + register in content service AppModule

**Files:**
- Create: `apps/content-service/src/dummy/dummy.module.ts`
- Modify: `apps/content-service/src/app.module.ts`

- [ ] **Step 1: Create DummyModule**

Create `apps/content-service/src/dummy/dummy.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { DummyController } from './dummy.controller';
import { DummyService } from './dummy.service';

@Module({
  controllers: [DummyController],
  providers: [DummyService],
})
export class DummyModule {}
```

- [ ] **Step 2: Register DummyModule in content service AppModule**

Modify `apps/content-service/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ContentModule } from './content/content.module';
import { DummyModule } from './dummy/dummy.module';

@Module({
  imports: [ContentModule, DummyModule],
})
export class AppModule {}
```

- [ ] **Step 3: Run all content service tests**

```bash
pnpm test --testPathPattern="content-service"
```

Expected: PASS — all tests

- [ ] **Step 4: Commit**

```bash
git add apps/content-service/src/dummy/dummy.module.ts apps/content-service/src/app.module.ts
git commit -m "feat(content): register DummyModule in AppModule"
```

---

## Task 4: DummyProxyService in gateway (TDD)

**Files:**
- Create: `apps/gateway/src/dummy/dummy-proxy.service.spec.ts`
- Create: `apps/gateway/src/dummy/dummy-proxy.service.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/gateway/src/dummy/dummy-proxy.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DummyProxyService } from './dummy-proxy.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('DummyProxyService', () => {
  let service: DummyProxyService;
  let httpService: HttpService;

  const mockBlogs = [{ id: '1', title: 'Test Blog', body: 'Body', author: 'Author', createdAt: '2026-01-01T00:00:00.000Z' }];
  const mockUsers = [{ id: '1', name: 'Test User', email: 'test@example.com', avatarUrl: 'https://i.pravatar.cc/150?img=1' }];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DummyProxyService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DummyProxyService>(DummyProxyService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('getBlogs', () => {
    it('should proxy GET /dummy/blogs to content service and return data', async () => {
      const response: AxiosResponse = { data: mockBlogs, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const result = await service.getBlogs();

      expect(httpService.get).toHaveBeenCalledWith(expect.stringContaining('/dummy/blogs'));
      expect(result).toEqual(mockBlogs);
    });
  });

  describe('getUsers', () => {
    it('should proxy GET /dummy/users to content service and return data', async () => {
      const response: AxiosResponse = { data: mockUsers, status: 200, statusText: 'OK', headers: {}, config: {} as any };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const result = await service.getUsers();

      expect(httpService.get).toHaveBeenCalledWith(expect.stringContaining('/dummy/users'));
      expect(result).toEqual(mockUsers);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --testPathPattern="dummy-proxy.service.spec"
```

Expected: FAIL with `Cannot find module './dummy-proxy.service'`

- [ ] **Step 3: Implement DummyProxyService**

Create `apps/gateway/src/dummy/dummy-proxy.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DummyProxyService {
  private readonly contentUrl =
    process.env.CONTENT_SERVICE_URL ?? 'http://localhost:3002';

  constructor(private readonly http: HttpService) {}

  async getBlogs() {
    const { data } = await firstValueFrom(
      this.http.get(`${this.contentUrl}/dummy/blogs`),
    );
    return data;
  }

  async getUsers() {
    const { data } = await firstValueFrom(
      this.http.get(`${this.contentUrl}/dummy/users`),
    );
    return data;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="dummy-proxy.service.spec"
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/dummy/dummy-proxy.service.ts apps/gateway/src/dummy/dummy-proxy.service.spec.ts
git commit -m "feat(gateway): add DummyProxyService proxying dummy routes to content service"
```

---

## Task 5: DummyProxyController in gateway (TDD)

**Files:**
- Create: `apps/gateway/src/dummy/dummy-proxy.controller.spec.ts`
- Create: `apps/gateway/src/dummy/dummy-proxy.controller.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/gateway/src/dummy/dummy-proxy.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DummyProxyController } from './dummy-proxy.controller';
import { DummyProxyService } from './dummy-proxy.service';

describe('DummyProxyController', () => {
  let controller: DummyProxyController;
  let service: DummyProxyService;

  const mockBlogs = [{ id: '1', title: 'Test Blog', body: 'Body', author: 'Author', createdAt: '2026-01-01T00:00:00.000Z' }];
  const mockUsers = [{ id: '1', name: 'Test User', email: 'test@example.com', avatarUrl: 'https://i.pravatar.cc/150?img=1' }];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DummyProxyController],
      providers: [
        {
          provide: DummyProxyService,
          useValue: {
            getBlogs: jest.fn().mockResolvedValue(mockBlogs),
            getUsers: jest.fn().mockResolvedValue(mockUsers),
          },
        },
      ],
    }).compile();

    controller = module.get<DummyProxyController>(DummyProxyController);
    service = module.get<DummyProxyService>(DummyProxyService);
  });

  describe('getBlogs', () => {
    it('should call DummyProxyService.getBlogs and return result', async () => {
      const result = await controller.getBlogs();
      expect(service.getBlogs).toHaveBeenCalled();
      expect(result).toEqual(mockBlogs);
    });
  });

  describe('getUsers', () => {
    it('should call DummyProxyService.getUsers and return result', async () => {
      const result = await controller.getUsers();
      expect(service.getUsers).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test --testPathPattern="dummy-proxy.controller.spec"
```

Expected: FAIL with `Cannot find module './dummy-proxy.controller'`

- [ ] **Step 3: Implement DummyProxyController**

Create `apps/gateway/src/dummy/dummy-proxy.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { DummyProxyService } from './dummy-proxy.service';

@Controller('dummy')
export class DummyProxyController {
  constructor(private readonly dummyProxy: DummyProxyService) {}

  @Get('blogs')
  getBlogs() {
    return this.dummyProxy.getBlogs();
  }

  @Get('users')
  getUsers() {
    return this.dummyProxy.getUsers();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test --testPathPattern="dummy-proxy.controller.spec"
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/dummy/dummy-proxy.controller.ts apps/gateway/src/dummy/dummy-proxy.controller.spec.ts
git commit -m "feat(gateway): add DummyProxyController with public GET /dummy/blogs and /dummy/users"
```

---

## Task 6: DummyModule + register in gateway AppModule

**Files:**
- Create: `apps/gateway/src/dummy/dummy.module.ts`
- Modify: `apps/gateway/src/app.module.ts`

- [ ] **Step 1: Create gateway DummyModule**

Create `apps/gateway/src/dummy/dummy.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DummyProxyController } from './dummy-proxy.controller';
import { DummyProxyService } from './dummy-proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [DummyProxyController],
  providers: [DummyProxyService],
})
export class DummyModule {}
```

- [ ] **Step 2: Register DummyModule in gateway AppModule**

Modify `apps/gateway/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { DummyModule } from './dummy/dummy.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AuthModule, ContentModule, DummyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: PASS — all tests

- [ ] **Step 4: Smoke test with Docker Compose**

```bash
docker compose up --build -d
```

Wait for all services to be healthy, then:

```bash
curl http://localhost:3000/dummy/blogs
```

Expected: JSON array of 5 blog objects.

```bash
curl http://localhost:3000/dummy/users
```

Expected: JSON array of 5 user objects.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/dummy/dummy.module.ts apps/gateway/src/app.module.ts
git commit -m "feat(gateway): register DummyModule in AppModule — public dummy endpoints live"
```
