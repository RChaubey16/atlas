# NestJS Concepts Used in Atlas

This document explains every NestJS concept used in this project — from scratch, with real examples from the code. No prior NestJS knowledge required.

---

## What is NestJS?

NestJS is a framework for building backend servers in TypeScript. A framework is not a library you call — it is a structure you build inside. NestJS gives you a specific way to organise your code: where things live, how they connect, and how requests flow through the system.

Under the hood, NestJS sits on top of **Express** (the most popular Node.js HTTP server). You get Express's raw power with NestJS's organisation on top.

The three most important ideas in NestJS are: **Modules**, **Controllers**, and **Providers (Services)**. Everything else builds on these three.

---

## 1. Decorators — The @ Symbols

Before explaining modules, controllers, or services, you need to understand **decorators**, because they appear everywhere.

A decorator is a special annotation starting with `@` that you place above a class, method, or parameter. It attaches metadata or behaviour to whatever it decorates — without changing the code itself.

Think of decorators like labels on boxes. The box (your class) does the work; the label tells the framework what kind of box it is and how to use it.

```ts
@Controller('auth')   // ← decorator on the class: "this is a controller for /auth routes"
export class AuthController {

  @Post('register')   // ← decorator on the method: "this handles POST /auth/register"
  register(@Body() dto: RegisterDto) {  // ← decorator on the parameter: "give me the request body"
    return this.authService.register(dto);
  }
}
```

Decorators are a TypeScript feature that NestJS uses heavily. Once you know what each decorator means, the code becomes very readable.

---

## 2. Modules — Organising the Application

**File examples:** `apps/gateway/src/app.module.ts`, `apps/auth-service/src/auth/auth.module.ts`

A **Module** is a logical grouping of related code. Every NestJS application has at least one module. Modules tell NestJS: "these controllers, services, and imports all belong together."

```ts
// apps/gateway/src/app.module.ts
@Module({
  imports: [AuthModule, ContentModule, DummyModule],
})
export class AppModule {}
```

This is the root module of the Gateway. It imports two feature modules — one for auth routes and one for content routes. NestJS reads this and assembles the entire application from these pieces.

```ts
// apps/auth-service/src/auth/auth.module.ts
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService],
})
export class AuthModule {}
```

The `@Module` decorator accepts an object with four possible keys:

| Key | What it does |
|---|---|
| `imports` | Other modules whose exported providers this module needs |
| `controllers` | The controllers (route handlers) that belong to this module |
| `providers` | Services, strategies, and other injectable classes |
| `exports` | Providers that other modules can use (not needed here yet) |

**Why modules?** Without them, everything would be wired together manually and the application would become one giant tangled file. Modules let you think in features: "the auth feature" is its own self-contained module.

---

## 3. Controllers — Handling HTTP Requests

**File examples:** `apps/auth-service/src/auth/auth.controller.ts`, `apps/content-service/src/content/content.controller.ts`

A **Controller** is responsible for receiving incoming HTTP requests and returning responses. It is the outer layer — the thing the internet talks to.

Controllers do not contain business logic. They receive the request, pull out the relevant data, hand it to a service, and return whatever the service gives back.

```ts
// apps/auth-service/src/auth/auth.controller.ts
@Controller('auth')                     // all routes in this controller start with /auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')                     // handles POST /auth/register
  register(@Body() dto: RegisterDto) {  // @Body() extracts the JSON body from the request
    return this.authService.register(dto);
  }

  @Post('login')                        // handles POST /auth/login
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {  // extracts just one field from the body
    return this.authService.refresh(refreshToken);
  }
}
```

### Route Decorators

These tell NestJS which HTTP method and path a handler responds to:

| Decorator | HTTP Method | Example URL |
|---|---|---|
| `@Get()` | GET | fetch data |
| `@Post()` | POST | create something |
| `@Put()` | PUT | replace something |
| `@Patch()` | PATCH | update part of something |
| `@Delete()` | DELETE | remove something |

### Parameter Decorators

These extract specific pieces from the incoming request:

| Decorator | What it gives you |
|---|---|
| `@Body()` | The entire JSON body of the request |
| `@Body('key')` | A single field from the JSON body |
| `@Param('id')` | A URL parameter like `/content/:id` |
| `@Headers('x-user-id')` | A specific HTTP header value |
| `@Request()` | The full request object (used to access `req.user`) |

**From the content service:**
```ts
@Get(':id')
findOne(@Param('id') id: string, @Headers('x-user-id') userId: string) {
  return this.contentService.findOneByOwner(id, userId);
}
```
This handles `GET /content/some-uuid`. The `:id` part is dynamic — NestJS extracts it and gives it to the method via `@Param('id')`.

---

## 4. Providers and Services — The Business Logic

**File examples:** `apps/auth-service/src/auth/auth.service.ts`, `apps/content-service/src/content/content.service.ts`

A **Provider** is any class decorated with `@Injectable()`. The most common kind of provider is a **Service**.

Services contain the actual logic: database queries, password hashing, token generation, validation — all of that lives here, away from the controller.

```ts
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    // check if email already exists
    // hash the password
    // save to database
    // return tokens
  }
}
```

`@Injectable()` is what marks a class as something NestJS can create and inject automatically. You declare it as a provider in a module, and NestJS handles creating it, passing its dependencies, and sharing it wherever it's needed.

---

## 5. Dependency Injection — How Things Connect

This is one of NestJS's most important concepts, and it is worth understanding deeply.

**Dependency Injection (DI)** means: instead of creating your own instances of things you depend on, you declare what you need and NestJS creates and provides them for you.

**Without DI (manual, fragile):**
```ts
// You'd have to do this yourself, everywhere
const prisma = new PrismaService();
const jwt = new JwtService();
const authService = new AuthService(prisma, jwt);
const authController = new AuthController(authService);
```

**With DI (NestJS way):**
```ts
// Just declare what you need in the constructor
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  // NestJS creates and injects AuthService automatically
}
```

NestJS maintains an **IoC container** (Inversion of Control) — essentially a registry of all providers. When a class declares a dependency in its constructor, NestJS looks it up in the registry and injects it automatically.

**How it works in this project:**

1. `AuthModule` registers `AuthService` and `PrismaService` as providers.
2. `AuthController` declares it needs `AuthService` in its constructor.
3. `AuthService` declares it needs `PrismaService` and `JwtService`.
4. NestJS creates `PrismaService` → then `JwtService` → then `AuthService` → then `AuthController`, passing each to the next.

You never call `new` on services. NestJS handles the whole chain.

**`private readonly` pattern:** The `private readonly authService: AuthService` shorthand in the constructor is TypeScript's way of both declaring a parameter AND assigning it as a class property in one line. It's used everywhere in this project.

---

## 6. Lifecycle Hooks — Responding to App Events

**File:** `apps/auth-service/src/prisma/prisma.service.ts`

NestJS provides special methods you can implement to hook into the application lifecycle — things like when the app starts or shuts down.

```ts
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();   // called when this module is fully loaded — open DB connection
  }

  async onModuleDestroy() {
    await this.$disconnect(); // called when this module is shutting down — close DB connection
  }
}
```

`OnModuleInit` and `OnModuleDestroy` are **interfaces** from NestJS. By implementing them, you promise to provide `onModuleInit()` and `onModuleDestroy()` methods. NestJS calls these at the right moment automatically.

This is how `PrismaService` ensures the database connection opens when the service starts and closes cleanly when the server shuts down — without any manual wiring.

---

## 7. Guards — Protecting Routes

**Files:** `apps/gateway/src/auth/jwt-auth.guard.ts`, `apps/gateway/src/content/content-proxy.controller.ts`

A **Guard** is a class that decides whether a request is allowed to reach a controller method. It runs before the controller and returns either `true` (let it through) or `false` (reject it).

```ts
// apps/gateway/src/auth/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

This guard extends NestJS Passport's built-in `AuthGuard`. When a request arrives, it looks for a JWT token in the `Authorization` header, verifies it using the JWT strategy, and either lets the request continue or throws a `401 Unauthorized` error.

Guards are applied with `@UseGuards()`:

```ts
// apps/gateway/src/content/content-proxy.controller.ts
@Controller('content')
@UseGuards(JwtAuthGuard)       // applied at the class level — protects ALL routes in this controller
export class ContentProxyController {

  @Post()
  create(@Body() body: unknown, @Request() req: AuthRequest) {
    // if we get here, the guard already verified the JWT
    // req.user is now populated with { userId, email }
    return this.contentProxy.createContent(body, req.user.userId);
  }
}
```

`@UseGuards()` can be placed on:
- A single method — protects only that route
- A class — protects all routes in the controller
- Globally (in `main.ts`) — protects every route in the entire application

**Intentionally public routes** omit `@UseGuards` entirely. In this project, `DummyProxyController` has no guard — it is meant to be reachable without a token. This is a deliberate design choice, not an oversight. The absence of `@UseGuards` is itself the declaration that a route is public.

---

## 8. Strategies (Passport) — The JWT Verification Logic

**Files:** `apps/gateway/src/auth/jwt.strategy.ts`, `apps/auth-service/src/auth/strategies/jwt.strategy.ts`

**Passport** is a popular authentication library for Node.js. NestJS integrates it via `@nestjs/passport`. A **Strategy** defines *how* to authenticate — in this case, how to verify a JWT token.

```ts
// apps/gateway/src/auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // ↑ tells Passport: "look for the token in the Authorization: Bearer <token> header"

      secretOrKey: process.env.JWT_ACCESS_SECRET ?? '',
      // ↑ the secret key used to verify the token's signature
    });
  }

  validate(payload: JwtPayload) {
    // ↑ called automatically after the token is verified
    // whatever you return here becomes req.user
    return { userId: payload.sub, email: payload.email };
  }
}
```

**How Guard and Strategy work together:**

```
Request arrives with: Authorization: Bearer eyJhbGc...

  JwtAuthGuard triggers
       ↓
  JwtStrategy.validate() is called
       ↓
  Token is verified against JWT_ACCESS_SECRET
       ↓
  If valid → { userId, email } is attached to req.user
  If invalid → 401 Unauthorized is returned immediately
```

The Guard is the enforcer. The Strategy is the logic it delegates to. Both are registered as providers in the module.

---

## 9. Pipes and Validation — Checking Incoming Data

**Files:** `apps/auth-service/src/main.ts`, `apps/auth-service/src/auth/dto/register.dto.ts`

A **Pipe** transforms or validates incoming data before it reaches the controller method. If validation fails, NestJS automatically returns a `400 Bad Request` error with details — the controller method is never even called.

**Enabling validation globally (in `main.ts`):**
```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  //                                      ↑ strips any extra fields not declared in the DTO
  await app.listen(3001);
}
```

`ValidationPipe` works together with **DTOs** and the `class-validator` library.

### DTOs — Data Transfer Objects

A **DTO** (Data Transfer Object) is a simple class that describes the shape of incoming data and declares validation rules using decorators.

```ts
// apps/auth-service/src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()           // must be a valid email format
  email: string;

  @IsString()          // must be a string
  @MinLength(8)        // must be at least 8 characters
  password: string;
}
```

When the controller declares `@Body() dto: RegisterDto`, NestJS:
1. Takes the raw JSON from the request body.
2. Creates a `RegisterDto` instance from it.
3. Runs `ValidationPipe` which checks all the `class-validator` decorators.
4. If any check fails → returns `400 Bad Request` automatically.
5. If all pass → calls the controller method with the validated object.

**`whitelist: true`** means NestJS strips any extra fields the client sends that are not declared in the DTO. This prevents attackers from sneaking in unexpected data.

---

## 10. Exception Handling — Returning Proper HTTP Errors

**File:** `apps/auth-service/src/auth/auth.service.ts`

NestJS provides a set of built-in exception classes that map directly to HTTP status codes. You throw them anywhere in your code and NestJS catches them and returns the correct response.

```ts
async register(dto: RegisterDto) {
  const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

  if (existing) {
    throw new ConflictException('Email already in use');
    // ↑ NestJS returns: HTTP 409 Conflict  { "message": "Email already in use" }
  }
}

async login(dto: LoginDto) {
  // ...
  if (!valid) {
    throw new UnauthorizedException('Invalid credentials');
    // ↑ NestJS returns: HTTP 401 Unauthorized  { "message": "Invalid credentials" }
  }
}
```

Common built-in exceptions:

| Exception Class | HTTP Status | When to use |
|---|---|---|
| `BadRequestException` | 400 | Invalid input that slipped past validation |
| `UnauthorizedException` | 401 | Not logged in / bad token |
| `ForbiddenException` | 403 | Logged in but not allowed |
| `NotFoundException` | 404 | Resource does not exist |
| `ConflictException` | 409 | Duplicate data (e.g., email taken) |

From the content service:
```ts
async findOneByOwner(id: string, ownerId: string) {
  const item = await this.prisma.content.findUnique({ where: { id } });
  if (!item) throw new NotFoundException('Content not found');     // 404
  if (item.ownerId !== ownerId) throw new ForbiddenException();   // 403
  return item;
}
```

---

## 11. HttpModule — Making Requests to Other Services

**Files:** `apps/gateway/src/auth/auth-proxy.service.ts`, `apps/gateway/src/content/content-proxy.service.ts`

The Gateway needs to forward requests to the Auth Service and Content Service. It does this using `@nestjs/axios`, which wraps the popular `axios` HTTP client in a NestJS-friendly injectable service.

```ts
// apps/gateway/src/auth/auth-proxy.service.ts
@Injectable()
export class AuthProxyService {
  private readonly authUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

  constructor(private readonly http: HttpService) {}
  //                              ↑ injected by NestJS, provided by HttpModule

  async login(body: unknown) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.authUrl}/auth/login`, body),
      //         ↑ makes an HTTP POST to the Auth Service
    );
    return data;
  }
}
```

`HttpService` returns **Observables** (from RxJS, a reactive programming library). `firstValueFrom()` converts the Observable into a regular Promise so you can use `await` with it. This is the standard pattern in this codebase.

To use `HttpService`, the module must import `HttpModule`:
```ts
@Module({
  imports: [PassportModule, HttpModule],  // ← HttpModule provides HttpService
  ...
})
export class AuthModule {}
```

---

## 12. JwtModule — Signing and Verifying Tokens

**File:** `apps/auth-service/src/auth/auth.module.ts`

`@nestjs/jwt` wraps the `jsonwebtoken` library and provides a `JwtService` injectable.

```ts
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),   // registers JwtService as a provider with no default config
  ],
  providers: [AuthService, JwtStrategy, PrismaService],
})
export class AuthModule {}
```

`JwtModule.register({})` is called with an empty object because in this project the secret and expiry are passed per-call (at sign time), rather than as defaults. This gives flexibility to use different secrets for access vs refresh tokens.

**Using `JwtService`:**
```ts
// Signing (creating a token)
const accessToken = this.jwtService.sign(
  { sub: userId, email },          // the payload — data baked into the token
  {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: 60 * 15,            // 15 minutes in seconds
  }
);

// Verifying (checking a token)
const payload = this.jwtService.verify<{ sub: string; email: string }>(
  refreshToken,
  { secret: process.env.JWT_REFRESH_SECRET },
);
```

---

## 13. NestJS Monorepo — One Repo, Multiple Apps

**File:** `nest-cli.json`

By default NestJS creates a single application. This project uses **monorepo mode**, where multiple applications and libraries live inside one repository, sharing the same `node_modules` and tooling.

```json
{
  "monorepo": true,
  "root": "apps/gateway",
  "projects": {
    "gateway":         { "type": "application", "root": "apps/gateway" },
    "auth-service":    { "type": "application", "root": "apps/auth-service" },
    "content-service": { "type": "application", "root": "apps/content-service" },
    "contracts":       { "type": "library",     "root": "libs/contracts" }
  }
}
```

**Applications** (`type: application`) are runnable servers — each starts its own process, listens on its own port.

**Libraries** (`type: library`) are shared code — they don't run on their own. Other apps import from them.

**Building a specific app:**
```bash
nest build gateway          # compiles only the gateway
nest build auth-service     # compiles only the auth service
```

**Path aliases for libraries:**

When `contracts` is a library, importing it by relative path from deep inside an app would be ugly:
```ts
import { UserCreatedEvent } from '../../../../libs/contracts/src';  // messy
```

NestJS sets up TypeScript path aliases so you can write:
```ts
import { UserCreatedEvent } from '@app/contracts';  // clean
```

This is configured in `tsconfig.json`:
```json
"paths": {
  "@app/contracts": ["libs/contracts/src"],
  "@app/contracts/*": ["libs/contracts/src/*"]
}
```

---

## 14. NestFactory — Bootstrapping the Application

**File:** `apps/auth-service/src/main.ts`

Every NestJS app starts in a `main.ts` file. `NestFactory.create()` boots the entire application: it reads the root module, resolves all dependencies, and starts the HTTP server.

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ↑ reads AppModule, wires all providers, controllers, and modules

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // ↑ applies the validation pipe to every route in this entire application

  await app.listen(process.env.AUTH_SERVICE_PORT ?? 3001);
  // ↑ starts listening for HTTP requests on port 3001
}
bootstrap();
```

`bootstrap` is just an async function — the `async/await` is needed because starting an HTTP server is an asynchronous operation.

---

## 15. How All the Concepts Connect — Full Picture

Here is how a `POST /auth/register` request flows through all these NestJS concepts:

```
1. CLIENT sends:  POST http://localhost:3000/auth/register
                  Body: { "email": "user@example.com", "password": "secret123" }

2. GATEWAY (NestFactory started on port 3000)
   → AuthProxyController receives the request  (@Controller('auth') + @Post('register'))
   → No guard on this route, so it passes straight through
   → AuthProxyService.register(body) is called
   → HttpService makes a POST to http://auth-service:3001/auth/register

3. AUTH SERVICE (NestFactory started on port 3001)
   → Request arrives at AuthController  (@Controller('auth') + @Post('register'))
   → ValidationPipe runs on the body
       - Checks @IsEmail() → valid
       - Checks @MinLength(8) → "secret123" is 9 chars → valid
   → AuthController calls authService.register(dto)
   → AuthService:
       - Queries DB: does this email exist? No.
       - Hashes the password with bcrypt
       - Saves the user via PrismaService
       - Logs the user.created event
       - Signs an accessToken (expires 15min) and refreshToken (expires 7 days)
       - Returns { accessToken, refreshToken }
   → AuthController returns the token pair

4. GATEWAY
   → Receives { accessToken, refreshToken } from Auth Service
   → Passes it straight back to the client

5. CLIENT receives: { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

---

## Summary of NestJS Building Blocks Used

| Concept | Decorator / Class | Where in the project |
|---|---|---|
| Module | `@Module()` | Every `*.module.ts` file |
| Controller | `@Controller()` | Every `*.controller.ts` file |
| Service / Provider | `@Injectable()` | Every `*.service.ts`, strategies, PrismaService |
| Route handling | `@Get()`, `@Post()` | All controllers |
| Request data | `@Body()`, `@Param()`, `@Headers()`, `@Request()` | All controllers |
| Dependency Injection | Constructor parameters | Everywhere |
| Guard | `@UseGuards()` + `AuthGuard` | Gateway content controller (dummy controller intentionally has none) |
| Strategy (Passport) | `PassportStrategy` | Both JWT strategy files |
| Validation Pipe | `ValidationPipe` | All three `main.ts` files |
| DTO + class-validator | `@IsEmail()`, `@IsString()`, etc. | All `dto/` files |
| HTTP exceptions | `UnauthorizedException`, `NotFoundException`, etc. | Auth and content services |
| HTTP client | `HttpModule` + `HttpService` | Gateway proxy services |
| JWT | `JwtModule` + `JwtService` | Auth service |
| Lifecycle hooks | `OnModuleInit`, `OnModuleDestroy` | PrismaService |
| Monorepo | `nest-cli.json` | Root config |
| Application bootstrap | `NestFactory.create()` | All three `main.ts` files |
