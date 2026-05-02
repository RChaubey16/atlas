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
| `@Query('page')` | A query string parameter like `?page=2&limit=20` |
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

**`@Query()` — query string parameters:**
```ts
@Get()
findAll(
  @Headers('x-user-id') userId: string,
  @Query('page') page?: string,    // extracts ?page=2
  @Query('limit') limit?: string,  // extracts ?limit=10
) {
  const p = parseInt(page ?? '1');
  const l = Math.min(parseInt(limit ?? '20'), 100);
  return this.linksService.findAllByUser(userId, p, l);
}
```
Query parameters are always strings — parse them to numbers when needed. Mark them optional (`?`) when the client is not required to supply them.

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

## 8. Strategies (Passport) — Authentication Logic

**Files:** `apps/gateway/src/auth/jwt.strategy.ts`, `apps/auth-service/src/auth/strategies/jwt.strategy.ts`, `apps/gateway/src/auth/strategies/google.strategy.ts`

**Passport** is a popular authentication library for Node.js. NestJS integrates it via `@nestjs/passport`. A **Strategy** defines *how* to authenticate. This project uses two strategies.

### JWT Strategy — verifying tokens on protected routes

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

### Google Strategy — OAuth 2.0 browser-based login

```ts
// apps/gateway/src/auth/strategies/google.strategy.ts
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken, _refreshToken, profile, done) {
    // ↑ called after Google confirms the user's identity
    // extracts the fields we care about and passes them to the controller via req.user
    const user = {
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
    };
    done(null, user);
  }
}
```

The second argument to `PassportStrategy(Strategy, 'google')` names the strategy `'google'`. This is what `GoogleAuthGuard extends AuthGuard('google')` refers to. Without the name, it would conflict with the default `'jwt'` strategy.

**How the Google OAuth flow works with Guards and Strategy:**

```
GET /auth/google
  GoogleAuthGuard triggers
       ↓
  Passport sees no session yet → calls Strategy to redirect
       ↓
  Browser is sent to Google's consent screen (302)

Google authenticates the user and redirects to:
GET /auth/google/callback?code=...
  GoogleAuthGuard triggers again
       ↓
  Passport exchanges the code for a Google profile
       ↓
  GoogleStrategy.validate() is called with the profile
       ↓
  { googleId, email, name } is attached to req.user
       ↓
  Controller calls Auth Service to find/create user and issue JWT pair
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
| `GoneException` | 410 | Resource existed but is no longer available (e.g., expired short link) |

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

## 12. ScheduleModule and `@Cron` — Recurring Background Jobs

**Files:** `apps/url-shortener/src/links/cleanup.service.ts`, `apps/url-shortener/src/app.module.ts`

`@nestjs/schedule` adds cron job support to NestJS. You enable it once in the root module and then annotate any service method with `@Cron()` to have NestJS call it on a schedule — no external process manager or OS cron needed.

**Registering the scheduler (once, in AppModule):**
```ts
// apps/url-shortener/src/app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), LinksModule, RedirectModule],
})
export class AppModule {}
```

`ScheduleModule.forRoot()` boots the scheduler. It must be called in the root module so it is ready before any `@Cron` method fires.

**Declaring a cron job:**
```ts
// apps/url-shortener/src/links/cleanup.service.ts
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CleanupService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *')   // ← standard cron expression: "at 02:00 every day"
  async deleteExpiredLinks(): Promise<void> {
    await this.prisma.shortLink.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
```

`@Cron()` accepts a standard 5-field cron expression (`minute hour day month weekday`) or one of NestJS's named constants (`CronExpression.EVERY_DAY_AT_2AM`, etc.).

The method is called automatically at the scheduled time. It does not need to be called anywhere else. NestJS handles registration and execution.

**Cron expression cheat-sheet:**

| Expression | When it runs |
|---|---|
| `'0 2 * * *'` | Every day at 2:00 AM |
| `'*/5 * * * *'` | Every 5 minutes |
| `'0 0 * * 0'` | Every Sunday at midnight |
| `'0 9 1 * *'` | 9 AM on the 1st of every month |

`CleanupService` must be listed as a provider in the module that provides `PrismaService`. It does not need to be exported — it runs silently in the background.

---

## 13. The `@Redirect()` Decorator — Issuing HTTP Redirects

**File:** `apps/url-shortener/src/redirect/redirect.controller.ts`

NestJS has a built-in `@Redirect()` decorator for controller methods that should respond with an HTTP redirect instead of a JSON body. When used without arguments, the method's return value controls the destination and status code.

```ts
// apps/url-shortener/src/redirect/redirect.controller.ts
@Controller('s')
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':slug')
  @Redirect()           // ← tells NestJS: "the return value is a redirect, not JSON"
  async redirect(@Param('slug') slug: string) {
    const url = await this.linksService.resolveAndTrack(slug);
    return { url, statusCode: 302 };
    //       ↑ NestJS reads these two fields and issues the redirect automatically
  }
}
```

When `@Redirect()` is used without arguments, NestJS expects the method to return an object with:
- `url` — the destination to redirect to
- `statusCode` — the HTTP status code (302 = temporary redirect, 301 = permanent)

If the method throws before returning (e.g. `NotFoundException` or `GoneException`), NestJS serves the error response instead — no redirect is issued.

**At the gateway layer**, the redirect controller works differently because it needs full control of the raw Express response:

```ts
// apps/gateway/src/url-shortener/url-shortener-redirect.controller.ts
@Controller('s')
export class UrlShortenerRedirectController {
  @Get(':slug')
  async redirect(@Param('slug') slug: string, @Res() res: Response) {
    const targetUrl = await this.proxy.resolveSlug(slug);
    return res.redirect(302, targetUrl);
    //         ↑ Express's redirect method — used when @Res() is injected directly
  }
}
```

`@Res()` gives you the raw Express `Response` object. Using it opts the method out of NestJS's automatic response handling — you must call `res.redirect()` (or `res.json()`, etc.) yourself.

---

## 14. Logger — Structured Application Logging

**Files:** `apps/auth-service/src/auth/auth.service.ts`, `apps/gateway/src/auth/auth-proxy.service.ts`, all `main.ts` files

NestJS ships with a built-in `Logger` class from `@nestjs/common`. Unlike most providers in this project it is not injected via the DI container — you instantiate it directly inside each class that needs it.

### Instantiation pattern

```ts
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  //                                   ↑ 'AuthService' — appears in every log line as context
}
```

`AuthService.name` is a JavaScript built-in that evaluates to the string `'AuthService'`. Passing the class name keeps logs easy to trace across a multi-service system where everything writes to the same stdout stream.

### Log levels

| Method | Severity | When to use |
|---|---|---|
| `logger.log(message)` | LOG | Normal domain events — user registered, link created |
| `logger.warn(message)` | WARN | Expected failures — login attempt failed, ownership check denied |
| `logger.error(message, trace?)` | ERROR | Unexpected failures — downstream service unreachable, unhandled exception |
| `logger.debug(message)` | DEBUG | Detailed trace for development; NestJS suppresses this level by default in production |

### Auth event logging in AuthService

The auth service logs one line per meaningful domain event, with `warn` for failures and `log` for successes:

```ts
// Registration
this.logger.log(`Registered user ${user.id} (${user.email})`);

// Login — two outcomes at different levels
this.logger.warn(`Login failed: ${dto.email}`);
this.logger.log(`Login: ${user.id} (${user.email})`);

// Token refresh
this.logger.warn('Token refresh failed: invalid or expired refresh token');
this.logger.log(`Token refreshed: ${payload.sub}`);
```

Using `warn` for failures means a monitoring tool can alert on elevated warn rates (e.g. a brute-force attempt) without parsing message strings or adding extra code.

### Upstream error logging in proxy services

Every gateway proxy service passes a context string to `rethrowUpstreamError` so the log identifies exactly which downstream call failed:

```ts
private rethrowUpstreamError(err: unknown, upstream: string): never {
  if (err instanceof AxiosError && err.response) {
    const { status } = err.response as { status: number; data: Record<string, unknown> };
    this.logger.warn(`Upstream error [${upstream}] ${status}`);
    // e.g. "Upstream error [auth-service/login] 401"
    // ...
  }
  this.logger.error(`Unexpected error [${upstream}]`, err);
  throw err as Error;
}
```

### Startup logging in main.ts

Each service's `main.ts` creates a `Logger('Bootstrap')` instance and emits one line after the port is bound:

```ts
const logger = new Logger('Bootstrap');
await app.listen(port);
logger.log(`Auth service listening on port ${port}`);
```

### Log output format

NestJS formats every line as:
```
[Nest] 12345  -  05/02/2026, 10:00:00 AM     LOG [AuthService] Registered user abc-123 (user@example.com)
       ↑ PID      ↑ timestamp                 ↑ level ↑ context   ↑ message
```

The context in brackets (`[AuthService]`, `[HTTP]`, `[Bootstrap]`) is the string you pass to the `Logger` constructor. Using `ClassName.name` keeps context names consistent with the actual source classes.

---

## 15. JwtModule — Signing and Verifying Tokens

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

## 16. NestJS Monorepo — One Repo, Multiple Apps

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
    "url-shortener":   { "type": "application", "root": "apps/url-shortener" },
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
nest build url-shortener    # compiles only the url-shortener service
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

**Contracts can export runtime values, not just types:**

A common mistake is treating `libs/contracts` as a types-only library. It can export any valid TypeScript — including runtime objects and maps that exist at runtime and can be iterated over.

In this project, `libs/contracts/src/templates/registry.ts` exports a plain object:

```ts
export const TEMPLATES: Record<string, TemplateDefinition> = {
  'welcome': welcomeTemplate,
  'password-reset': passwordResetTemplate,
  'feature-announcement': featureAnnouncementTemplate,
};
```

The Gateway's `TemplatesController` imports this map directly and returns it from an HTTP endpoint — no database, no downstream service:

```ts
// apps/gateway/src/templates/templates.controller.ts
import { TEMPLATES } from '@app/contracts';

@Controller('templates')
export class TemplatesController {
  @Get()
  list() {
    return Object.values(TEMPLATES).map(({ id, name, description, subject, fields }) => ({
      id, name, description, subject, fields,
    }));
  }

  @Get(':id/preview')
  preview(@Param('id') id: string) {
    const template = TEMPLATES[id];
    if (!template) throw new NotFoundException(`Template "${id}" not found`);
    return { id: template.id, subject: template.subject, html: template.html(template.previewData) };
  }
}
```

This pattern is appropriate when the data is static and known at build time. If templates were user-configurable and stored in a database, you would query them in a service instead.

---

## 17. NestJS Microservices — Event-Driven Services

**Files:** `apps/notification-service/src/main.ts`, `apps/notification-service/src/notification/notification.service.ts`, `apps/auth-service/src/auth/auth.module.ts`, `apps/auth-service/src/auth/auth.service.ts`

NestJS supports running services as **microservices** — processes that communicate not via HTTP but via a message broker (in this project, RabbitMQ). A microservice has no HTTP port; it connects to a queue and waits for messages.

### Bootstrapping a Microservice

A pure microservice (no HTTP) uses `NestFactory.createMicroservice()`:

```ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  NotificationModule,
  {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
      queue: 'notification_queue',
      queueOptions: { durable: true },
    },
  },
);
await app.listen();  // connects to RabbitMQ — no HTTP port opened
```

### Bootstrapping a Hybrid App (HTTP + microservice in one process)

The Notification Service runs as a **hybrid** — it handles both HTTP requests and RabbitMQ messages in the same process. You start with `NestFactory.create()` (HTTP), then attach the microservice transport with `connectMicroservice()`:

```ts
// apps/notification-service/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  //          ↑ standard HTTP app — enables body parsing, global pipes, etc.

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
      queue: 'notification_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  //    ↑ connects to RabbitMQ and starts consuming messages

  await app.listen(process.env.NOTIFICATION_SERVICE_PORT ?? 3004);
  //    ↑ also opens an HTTP port for direct API calls
}
```

The same controller class can have both `@EventPattern` methods (consumed via RabbitMQ) and `@Post` methods (consumed via HTTP) — NestJS routes each message to the right handler based on the transport context.

**One important nuance with guards in hybrid apps:** guards that call `context.switchToHttp()` (like `InternalKeyGuard`) only apply when the method is called via HTTP. When an `@EventPattern` handler fires via RabbitMQ, the execution context is `RpcContext`, not `HttpContext`. A method-level `@UseGuards()` on the HTTP handler does not affect the RMQ handler in the same controller, so the two can coexist safely.

### Consuming Events — `@EventPattern` and `@Payload`

On the consumer side, you mark a method with `@EventPattern()` to tell NestJS: "call this method whenever a message with this event name arrives."

```ts
// apps/notification-service/src/notification/notification.service.ts
@Injectable()
export class NotificationService {
  constructor(private readonly emailService: EmailService) {}

  @EventPattern(USER_CREATED_EVENT)          // listen for 'user.created' messages
  async handleUserCreated(
    @Payload() event: UserCreatedEvent,      // @Payload() extracts the message body
  ): Promise<void> {
    await this.emailService.sendMail(event.email, new WelcomeEmailTemplate());
  }
}
```

`@EventPattern` is the microservice equivalent of `@Post()` — it registers a handler for a specific message type.

`@Payload()` is the microservice equivalent of `@Body()` — it extracts the data from the incoming message.

### Publishing Events — `ClientProxy` and `ClientsModule`

On the publisher side (auth-service), you register a **client** that knows how to send messages to the queue:

```ts
// apps/auth-service/src/auth/auth.module.ts
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIFICATION_SERVICE',          // injection token
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'],
          queue: 'notification_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  ...
})
export class AuthModule {}
```

`ClientsModule.register()` creates a `ClientProxy` and registers it in the DI container under the token `'NOTIFICATION_SERVICE'`. You inject it with `@Inject()`:

```ts
// apps/auth-service/src/auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    //       ↑ string token, so @Inject() is needed instead of the automatic type-based injection
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    // ... save user ...

    // Fire-and-forget: emit() returns an Observable but we don't subscribe.
    // RabbitMQ transport buffers the message; no subscription needed for delivery.
    this.notificationClient.emit(USER_CREATED_EVENT, event);

    return this.issueTokens(user.id, user.email);
  }
}
```

`emit()` is fire-and-forget — it sends the message and returns immediately. The HTTP response is not delayed waiting for the email to be sent.

### Why String Tokens?

Normally NestJS injects by type — `private readonly jwtService: JwtService` works automatically because TypeScript knows the type. String tokens (`'NOTIFICATION_SERVICE'`) are used when the same type (`ClientProxy`) could refer to different clients (e.g., one for notifications, one for analytics). The `@Inject('...')` decorator tells NestJS which specific client to use.

### HTTP Service vs Microservice vs Hybrid

| | HTTP Service (gateway, auth, content, url-shortener) | Pure Microservice | Hybrid (notification) |
|---|---|---|---|
| Bootstrap | `NestFactory.create()` | `NestFactory.createMicroservice()` | `NestFactory.create()` + `connectMicroservice()` |
| Transport | HTTP (port) | RabbitMQ (queue) | Both |
| Receives | HTTP requests | Queue messages | HTTP requests AND queue messages |
| Route handler | `@Get()`, `@Post()` | `@EventPattern()` | Both, in the same controller |
| Data extraction | `@Body()`, `@Param()` | `@Payload()` | Both |
| Response | Returns data to caller | Acknowledges message | Returns data (HTTP) or acknowledges (RMQ) |

---

## 18. NestFactory — Bootstrapping the Application (HTTP Services)

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

## 19. Interceptors — Cross-cutting Concerns

**File:** `apps/gateway/src/common/http-logging.interceptor.ts`

An **Interceptor** is a class that wraps a route handler. It can execute logic before the handler runs, observe or transform the result after it completes, and catch any exceptions the handler throws. Interceptors implement the `NestInterceptor` interface.

### Why not middleware or a guard?

| Mechanism | Runs before handler | Runs after handler | Sees the result | Sees exceptions |
|---|---|---|---|---|
| Middleware | Yes | No | No | No |
| Guard | Yes | No | No | No |
| **Interceptor** | **Yes** | **Yes** | **Yes** | **Yes (via catchError)** |
| Exception filter | No | Error only | Error shape | Yes |

HTTP request logging needs to capture data from both sides of the handler: the incoming request (method, URL, start time) and the outgoing result (status code, elapsed time). Only an interceptor has access to both, making it the correct tool for this use case.

### Structure of the HttpLoggingInterceptor

```ts
// apps/gateway/src/common/http-logging.interceptor.ts
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;  // captured before the handler runs
    const start = Date.now();

    return next.handle().pipe(   // next.handle() delegates to the actual route handler
      tap(() => {
        // runs after the handler returns successfully
        const res = context.switchToHttp().getResponse<Response>();
        this.logger.log(`${method} ${url} ${res.statusCode} +${Date.now() - start}ms`);
      }),
      catchError((err: unknown) => {
        // runs after the handler throws — log, then re-throw
        const status = (err as { status?: number })?.status ?? 500;
        this.logger.warn(`${method} ${url} ${status} +${Date.now() - start}ms`);
        return throwError(() => err);
        // ↑ re-throw as an Observable so NestJS exception filters still handle the response shape
      }),
    );
  }
}
```

`next.handle()` returns an **Observable** (from RxJS). You attach behaviour with `.pipe()`:
- `tap(fn)` — runs a side-effect on each emitted value without altering it (success path)
- `catchError(fn)` — intercepts a thrown error; must return an Observable (`throwError()` re-wraps the error)

### Registering a global interceptor

Because `HttpLoggingInterceptor` has no injected dependencies, it is registered in `main.ts` using `useGlobalInterceptors()`:

```ts
app.useGlobalInterceptors(new HttpLoggingInterceptor());
```

This applies the interceptor to every route in the gateway. For interceptors that need DI (e.g. they depend on a `ConfigService`), use the `APP_INTERCEPTOR` token in a module instead:

```ts
// Pattern when the interceptor needs DI:
@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor }],
})
export class AppModule {}
```

### Output

Every request through the gateway produces exactly one log line:
```
[Nest]  -  LOG [HTTP] GET /content 200 +23ms
[Nest]  -  WARN [HTTP] POST /auth/login 401 +18ms
```

The `warn` level for 4xx/5xx means a monitoring system can alert on elevated warn rates without needing to filter on specific status codes.

---

## 20. ThrottlerModule — Rate Limiting

**Files:** `apps/gateway/src/app.module.ts`, `apps/gateway/src/common/user-throttler.guard.ts`, `apps/gateway/src/auth/auth-proxy.controller.ts`

`@nestjs/throttler` adds rate limiting to NestJS with three pieces: a module that sets the limits, a guard that enforces them, and a decorator that overrides the defaults per route.

### Setting up the module

```ts
// apps/gateway/src/app.module.ts
ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 100 }])
```

`ttl` is in milliseconds (60000 ms = 60 s). `limit` is the maximum number of requests allowed in that window. The `name` field (`'global'`) is the throttler's identifier — used when overriding limits per route.

### Registering the guard globally

```ts
providers: [
  { provide: APP_GUARD, useClass: UserThrottlerGuard },
]
```

Using `APP_GUARD` (from `@nestjs/core`) applies the guard to every route in the application — equivalent to calling `app.useGlobalGuards()`, but with full access to the DI container.

### Tracking per-user vs per-IP

By default `ThrottlerGuard` uses the request IP as the counter key. In this project, content and link creation routes are authenticated — it is more meaningful to count per user than per IP (users on shared IPs or proxies should not interfere with each other).

`UserThrottlerGuard` extends `ThrottlerGuard` and overrides `getTracker()`:

```ts
// apps/gateway/src/common/user-throttler.guard.ts
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { userId?: string } | undefined;
    const key = user?.userId ?? (req as unknown as Request).ip ?? 'unknown';
    return Promise.resolve(key);
  }
}
```

For an authenticated request, `req.user` is populated by `JwtAuthGuard` before the throttler runs — so `userId` is available. For unauthenticated routes (auth endpoints, health, redirects), `req.user` is undefined and the IP is used instead.

### Overriding limits per route

`@Throttle()` accepts an object keyed by throttler name. The value overrides both `limit` and `ttl` for that specific route:

```ts
// Strict — 5 attempts per 60 s (per IP, no JWT on these routes)
@Throttle({ global: { limit: 5, ttl: 60000 } })
@Post('login')
login(@Body() dto: LoginDto) { ... }

// Loose — 20 creations per 60 s (per userId, JWT required)
@Throttle({ global: { limit: 20, ttl: 60000 } })
@Post()
create(@Body() dto: CreateContentDto, @Request() req: AuthRequest) { ... }
```

When the limit is exceeded the guard automatically returns `429 Too Many Requests` — no extra exception handling is needed.

### Applied limits in this project

| Route | Limit | Window | Key |
|---|---|---|---|
| `POST /auth/login` | 5 | 60 s | IP |
| `POST /auth/register` | 5 | 60 s | IP |
| `POST /content` | 20 | 60 s | userId |
| `POST /links` | 20 | 60 s | userId |
| All other routes | 100 | 60 s | IP |

---

## 21. How All the Concepts Connect — Full Picture

Here is how a `POST /auth/register` request flows through all these NestJS concepts:

```
1. CLIENT sends:  POST http://localhost:3000/auth/register
                  Body: { "email": "user@example.com", "password": "secret123" }

2. GATEWAY (NestFactory started on port 3000)
   → HttpLoggingInterceptor intercepts the request — records method, URL, and start time
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
       - Emits user.created event to RabbitMQ (fire-and-forget)
       - logger.log('Registered user abc-123 (user@example.com)')
       - Signs an accessToken (expires 15min) and refreshToken (expires 7 days)
       - Returns { accessToken, refreshToken }
   → AuthController returns the token pair

4. GATEWAY
   → Receives { accessToken, refreshToken } from Auth Service
   → Passes it straight back to the client
   → HttpLoggingInterceptor logs 'POST /auth/register 201 +Xms'

5. CLIENT receives: { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

---

## Summary of NestJS Building Blocks Used

| Concept | Decorator / Class | Where in the project |
|---|---|---|
| Module | `@Module()` | Every `*.module.ts` file |
| Controller | `@Controller()` | Every `*.controller.ts` file |
| Service / Provider | `@Injectable()` | Every `*.service.ts`, strategies, PrismaService |
| Route handling | `@Get()`, `@Post()`, `@Delete()` | All HTTP controllers |
| Request data | `@Body()`, `@Param()`, `@Query()`, `@Headers()`, `@Request()` | All HTTP controllers |
| Dependency Injection | Constructor parameters | Everywhere |
| Guard | `@UseGuards()` + `AuthGuard` | Gateway content + link controllers (dummy and redirect controllers intentionally have none) |
| Strategy (Passport) — JWT | `PassportStrategy(Strategy)` | `jwt.strategy.ts` in gateway and auth-service |
| Strategy (Passport) — Google | `PassportStrategy(Strategy, 'google')` | `google.strategy.ts` in gateway |
| Validation Pipe | `ValidationPipe` | All HTTP `main.ts` files |
| DTO + class-validator | `@IsEmail()`, `@IsString()`, etc. | All `dto/` files |
| HTTP exceptions | `UnauthorizedException`, `NotFoundException`, `GoneException`, etc. | Auth, content, and url-shortener services |
| HTTP redirect | `@Redirect()` | `RedirectController` in url-shortener |
| Raw response | `@Res()` + `res.redirect()` | Gateway `UrlShortenerRedirectController` |
| HTTP client | `HttpModule` + `HttpService` | Gateway proxy services |
| Cron jobs | `ScheduleModule.forRoot()` + `@Cron()` | `CleanupService` in url-shortener |
| JWT | `JwtModule` + `JwtService` | Auth service |
| Lifecycle hooks | `OnModuleInit`, `OnModuleDestroy` | PrismaService (all services) |
| Monorepo | `nest-cli.json` | Root config |
| HTTP bootstrap | `NestFactory.create()` | Gateway, auth, content, url-shortener `main.ts` |
| Hybrid bootstrap | `NestFactory.create()` + `connectMicroservice()` + `startAllMicroservices()` | Notification service `main.ts` |
| Event consumer | `@EventPattern()`, `@Payload()` | `NotificationController.handleUserCreated` |
| Event publisher | `ClientsModule`, `ClientProxy`, `.emit()` | Auth service module + service |
| Custom guard | `CanActivate` + `context.switchToHttp()` | `InternalKeyGuard` in notification service |
| Contracts runtime export | Plain `const` object in `libs/contracts` | `TEMPLATES` registry used by `TemplatesController` |
| Logger | `new Logger(ClassName.name)` | All service files and `main.ts` bootstrap functions |
| Interceptor | `NestInterceptor` + `useGlobalInterceptors()` | `HttpLoggingInterceptor` in gateway |
| Rate limiting | `ThrottlerModule` + `APP_GUARD` + `@Throttle()` | `UserThrottlerGuard` + auth and content controllers in gateway |
