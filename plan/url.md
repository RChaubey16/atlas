# URL Shortener — Improvement Backlog

Current state: create, list, delete, redirect, click count, 30-day expiry, nightly cleanup cron. The core is solid. These improvements would take it from a demo to a credible production-grade shortener.

---

## HIGH PRIORITY

### 1. SSRF Protection on `targetUrl` ✅

**Problem:** `CreateLinkDto` validates that `targetUrl` is a valid URL, but it does not block URLs that resolve to private or loopback addresses. A user could create a link pointing to `http://127.0.0.1:3001/auth` or `http://192.168.1.1/admin` and use the redirect service as a proxy to reach internal infrastructure.

**What to do:**
- After `@IsUrl()` validation passes, resolve the hostname and reject any IP in the ranges `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `::1`, and `169.254.0.0/16` (link-local).
- Throw `400 Bad Request` with the message `"targetUrl must not point to a private or loopback address"`.
- This can be a custom `class-validator` decorator or a guard in the service layer.

**Files:** `apps/url-shortener/src/links/dto/create-link.dto.ts`, `apps/url-shortener/src/links/links.service.ts`

#### What was done

Added `validateNoSsrf(url: string)` as a private method on `LinksService`. It:

1. Parses the hostname from the URL via `new URL()`.
2. Strips IPv6 brackets (e.g. `[::1]` → `::1`).
3. If the hostname is already an IP address (detected with `isIP()` from Node's `net` module), checks it immediately against all private/loopback ranges.
4. If the hostname is a domain name, resolves it via `dns/promises lookup()` and checks the resolved address.
5. Fails open if DNS is temporarily unavailable (allows the URL) to avoid false-positive 400s during DNS outages.

Blocked ranges: `127.0.0.0/8`, `10.0.0.0/8`, `0.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `100.64.0.0/10` (Shared Address Space), IPv6 `::1`, `fe80::/10`, `fc00::/7`.

`validateNoSsrf` is called at the start of both `create()` and `update()` (re-validates if `targetUrl` changes on a PATCH).

---

### 2. Configurable Link Expiry ✅

**Problem:** Expiry is hardcoded to 30 days (`Date.now() + 30 * 24 * 60 * 60 * 1000`) in `LinksService.create()`. There is no way for a caller to request a shorter or longer-lived link, or a link that never expires.

**What to do:**
- Add an optional `expiresInDays` field to `CreateLinkDto` with a range of `1–365`. If omitted, default to 30.
- Add a separate `noExpiry: boolean` option that sets `expiresAt` to a far-future sentinel (e.g. year 9999) or stores `null` and adjusts the expiry check accordingly.
- Update the `ShortLink` Prisma model to make `expiresAt` nullable (`DateTime?`) so a null value means "never expires".
- Migration required.

**Files:** `apps/url-shortener/src/links/dto/create-link.dto.ts`, `apps/url-shortener/src/links/links.service.ts`, `prisma/schema.prisma`

#### What was done

**Schema** — `expiresAt` changed from `DateTime` to `DateTime?` on `ShortLink`. Migration `20260502102932_make_expires_at_nullable` applied (`ALTER TABLE "ShortLink" ALTER COLUMN "expiresAt" DROP NOT NULL`).

**`CreateLinkDto`** — two new optional fields:
- `expiresInDays: number` — validated as `@IsInt() @Min(1) @Max(365)`. Defaults to 30 when omitted and `noExpiry` is false.
- `noExpiry: boolean` — when `true`, `expiresAt` is stored as `null`.

**`LinksService`** — the hardcoded 30-day calculation replaced by a private `buildExpiry(noExpiry?, expiresInDays?)` helper that returns `null` for never-expiring links or `new Date(Date.now() + days * 86400000)` otherwise.

**`resolveAndTrack()`** — expiry guard updated to `if (link.expiresAt !== null && link.expiresAt < new Date())` so null-expiry links are always resolved. The nightly cleanup cron requires no change — Prisma's `lt` filter naturally skips null rows.

**`ShortLinkResponse`** interface — `expiresAt` typed as `Date | null`.

---

### 3. Link Update Endpoint (`PATCH /links/:slug`) ✅

**Problem:** Once a link is created there is no way to change its `targetUrl` or extend its expiry. The only option is delete and recreate, which changes the slug and breaks all existing short URLs.

**What to do:**
- Add `PATCH /links/:slug` accepting `{ targetUrl?, expiresInDays? }` (both optional, at least one required).
- Enforce ownership — only the link owner can update it (same check as delete).
- Return the updated link in the same `ShortLinkResponse` shape.

**Files:** `apps/url-shortener/src/links/links.controller.ts`, `apps/url-shortener/src/links/links.service.ts`, new `update-link.dto.ts`

#### What was done

**`UpdateLinkDto`** — new `apps/url-shortener/src/links/dto/update-link.dto.ts` with three optional fields: `targetUrl` (`@IsUrl`), `expiresInDays` (`@IsInt @Min(1) @Max(365)`), `noExpiry` (`@IsBoolean`). No `@AtLeastOne` constraint — an empty PATCH is a no-op (Prisma update with no changed fields is safe).

**`LinksService.update(slug, dto, userId)`** — ownership check mirrors `delete()`. If `dto.targetUrl` is present, calls `validateNoSsrf()` before writing. Expiry is recalculated via the existing `buildExpiry()` helper when either `expiresInDays` or `noExpiry` is supplied; omitting both leaves `expiresAt` unchanged. Returns the updated record in `ShortLinkResponse` shape.

**`LinksController`** — new `PATCH /links/:slug` route, same `x-user-id` header guard as the other owner-only routes.

**Gateway** — `UrlShortenerProxyController` exposes `PATCH /links/:slug` forwarding body and `userId`; `UrlShortenerProxyService.updateLink()` calls the upstream with `this.http.patch()` and goes through `rethrowUpstreamError()` for consistent error propagation.

---

### 4. Click Analytics Endpoint (`GET /links/:slug/analytics`) ✅

**Problem:** The API exposes only a raw `clickCount`. The `ClickEvent` table stores `clickedAt` timestamps, so richer analytics are already possible with no schema change.

**What to do:**
- Add `GET /links/:slug/analytics` (owner only).
- Return:
  - `totalClicks` — total all-time count
  - `clicksByDay` — array of `{ date: "YYYY-MM-DD", count: number }` for the last 30 days
  - `lastClickedAt` — ISO timestamp of most recent click, or `null`
- Compute `clicksByDay` with a `GROUP BY DATE(clicked_at)` raw query (Prisma's `$queryRaw`).

**Files:** `apps/url-shortener/src/links/links.service.ts`, `apps/url-shortener/src/links/links.controller.ts`

#### What was done

**`LinksService.getAnalytics(slug, userId)`** — ownership check, then three queries run in parallel via `Promise.all`:
1. `clickEvent.count()` — total all-time clicks.
2. `$queryRaw` — `SELECT DATE("clickedAt") AS date, COUNT(*)::int AS count FROM "ClickEvent" WHERE "shortLinkId" = ${id} AND "clickedAt" >= NOW() - INTERVAL '30 days' GROUP BY DATE("clickedAt") ORDER BY date ASC`. The `::int` cast is required because PostgreSQL `COUNT` returns `bigint`, which Prisma surfaces as a `BigInt` in JS.
3. `clickEvent.findFirst({ orderBy: { clickedAt: 'desc' }, select: { clickedAt: true } })` — most recent click timestamp.

Returns `{ totalClicks, clicksByDay: [{ date: "YYYY-MM-DD", count }], lastClickedAt: ISO string | null }`.

**`LinksController`** — new `GET /links/:slug/analytics` route with `x-user-id` header guard. Placed before the `DELETE :slug` route to avoid any ambiguity (different HTTP verbs; NestJS matches by method + path).

**Gateway** — `UrlShortenerProxyController` exposes `GET /links/:slug/analytics` forwarding `userId`; `UrlShortenerProxyService.getLinkAnalytics()` calls the upstream with a `userId` query param and returns the analytics payload.

---

### 5. Richer Click Event Data

**Problem:** `ClickEvent` only records `shortLinkId` and `clickedAt`. In practice, knowing where clicks come from (referrer, device type, country) is the main reason people use a URL shortener.

**What to do:**
- Add columns to `ClickEvent`: `ipHash` (hashed, for privacy), `userAgent`, `referer`, `country` (from IP lookup).
- Collect `ip`, `User-Agent`, and `Referer` headers in `resolveAndTrack()`.
- For country lookup, use a lightweight in-process GeoIP library (`geoip-lite`) rather than an external API — no latency added to the redirect path.
- Hash the IP with SHA-256 before storing (GDPR consideration).
- Migration required.
- Surface aggregated breakdowns (top referrers, device type split) in the analytics endpoint from item 4.

**Files:** `prisma/schema.prisma`, `apps/url-shortener/src/links/links.service.ts`, `apps/url-shortener/src/redirect/redirect.controller.ts`

---

### 6. Pagination on `GET /links` ✅

**Problem:** `findAllByUser()` fetches every link for the user with no limit. A user with hundreds of links will get a large unbounded response.

**What to do:**
- Add optional `page` and `limit` query parameters (`limit` capped at 100, default 20).
- Return a wrapper: `{ data: ShortLinkResponse[], total: number, page: number, pages: number }`.
- Use Prisma's `skip` / `take` with a parallel `count()` query.

**Files:** `apps/url-shortener/src/links/links.controller.ts`, `apps/url-shortener/src/links/links.service.ts`

#### What was done

**`PaginatedLinksResponse`** — new interface `{ data: ShortLinkResponse[], total: number, page: number, pages: number }` defined in `links.service.ts`.

**`LinksService.findAllByUser(userId, page, limit)`** — signature extended with `page: number` and `limit: number` (both required; defaults applied in the controller). Uses `skip: (page - 1) * limit` and `take: limit`. A parallel `prisma.shortLink.count({ where: { userId } })` provides the total; `pages` is `Math.ceil(total / limit)`.

**`LinksController.findAll()`** — reads `@Query('page')` and `@Query('limit')` as strings, parses them with `parseInt`, clamps `limit` to 1–100 (defaulting to 20) and coerces `page` to minimum 1.

**Gateway** — `UrlShortenerProxyController.getMyLinks()` accepts optional `@Query('page')` and `@Query('limit')` strings and forwards them to `UrlShortenerProxyService.getMyLinks()`, which appends them as query params via `URLSearchParams` only when defined.

---

## MEDIUM PRIORITY

### 7. Link Enable / Disable (Soft Pause)

**Problem:** Deleting a link is irreversible — the slug is gone. Sometimes a user wants to temporarily pause a link (e.g. a campaign that is not yet live) without losing the slug.

**What to do:**
- Add `isActive Boolean @default(true)` to `ShortLink`.
- `resolveAndTrack()` checks `isActive` and throws `403 Forbidden` (or a custom `423 Locked`) if inactive.
- Add `PATCH /links/:slug/disable` and `PATCH /links/:slug/enable` endpoints (or handle through the update endpoint from item 3).
- Migration required.

**Files:** `prisma/schema.prisma`, `apps/url-shortener/src/links/links.service.ts`, `apps/url-shortener/src/links/links.controller.ts`

---

### 8. One-Time Links

**Problem:** There is no way to create a link that self-destructs after the first click — useful for sharing sensitive resources.

**What to do:**
- Add `oneTime Boolean @default(false)` to `ShortLink`.
- In `resolveAndTrack()`, after recording the click, delete the link if `oneTime` is true (or set `isActive = false` so the slug shows a meaningful error rather than a generic 404).
- Expose `oneTime` as an optional field in `CreateLinkDto`.
- Migration required.

**Files:** `prisma/schema.prisma`, `apps/url-shortener/src/links/dto/create-link.dto.ts`, `apps/url-shortener/src/links/links.service.ts`

---

### 9. Password-Protected Links

**Problem:** There is no way to restrict who can follow a link — anyone with the slug can use it.

**What to do:**
- Add `passwordHash String?` to `ShortLink`.
- When `resolveAndTrack()` is called on a password-protected link, return a `401` with `{ requiresPassword: true }` instead of redirecting.
- Add a separate `POST /s/:slug/verify` endpoint that accepts `{ password }`, checks it against the hash, and returns the `targetUrl` if correct. The redirect is then issued client-side (or via a short-lived signed token).
- Expose `password` as an optional field in `CreateLinkDto` (hashed before storage, never returned).
- Migration required.

---

### 10. QR Code Generation (`GET /links/:slug/qr`)

**Problem:** A common use case for short links is printing them on physical materials. QR codes for the short URL are typically needed alongside the link itself.

**What to do:**
- Add `GET /links/:slug/qr` (owner only, or public — configurable).
- Use the `qrcode` npm package to generate a PNG or SVG in-process — no external service dependency.
- Return the image with the appropriate `Content-Type` (`image/png` or `image/svg+xml`).
- Cache the generated image in memory (the QR code for a given slug never changes).

**Files:** new `apps/url-shortener/src/links/qr.controller.ts`

---

### 11. Redirect Type (301 vs 302)

**Problem:** All redirects are `302 Temporary Redirect`. This means browsers and CDNs never cache them. For links that will never change (permanent campaign URLs), `301 Permanent Redirect` is more efficient — it removes load from the redirect service entirely after the first visit.

**What to do:**
- Add `permanent Boolean @default(false)` to `ShortLink`.
- Expose as an optional `permanent` field in `CreateLinkDto`.
- In `RedirectController`, return `statusCode: 301` when `link.permanent` is true.
- Note in docs: `301` redirects are cached by the browser. Changing or deleting a permanent link will not affect users whose browsers have cached the redirect.
- Migration required.

---

### 12. Link Preview Endpoint (`GET /s/:slug/info`)

**Problem:** Users copying a short link from an untrusted source have no way to inspect the destination before following it. Adding a preview endpoint (similar to Bitly's `+` suffix) addresses this.

**What to do:**
- Add `GET /s/:slug/info` — no auth required, no click is recorded.
- Return `{ slug, targetUrl, expiresAt, createdAt }`. Do not return `userId` or internal IDs.
- Useful for link-preview cards in messaging apps.

---

## LOW PRIORITY / POLISH

### 13. Database Index on `ShortLink.userId`

**Problem:** `findAllByUser()` runs `WHERE userId = ?` with no index. Postgres will do a full table scan as the table grows.

**What to do:**
- Add `@@index([userId])` to the `ShortLink` model in `prisma/schema.prisma`.
- Also consider a composite index on `(userId, createdAt)` since the query always sorts by `createdAt DESC`.
- Migration required (non-destructive — just adds an index).

**Files:** `prisma/schema.prisma`

---

### 14. Slug Generation Robustness

**Problem:** `generateUniqueSlug()` tries a random slug up to 5 times and throws `500 Internal Server Error` if all 5 collide. At low data volumes this is practically impossible, but it is a latent reliability issue.

**What to do:**
- Increase the retry count to 10.
- After the first few failures, switch to a longer slug length (8 characters instead of 6) to reduce collision probability.
- Log a `warn` when more than 2 retries are needed — that signals the slug space is getting crowded.

**Files:** `apps/url-shortener/src/links/links.service.ts`

---

### 15. UTM Parameter Injection

**Problem:** Marketers typically want to append UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`) to every click for attribution in Google Analytics. Currently they must include these in `targetUrl` manually.

**What to do:**
- Add optional `utmSource`, `utmMedium`, `utmCampaign` fields to `CreateLinkDto`.
- Store them as separate columns (or a JSON column) on `ShortLink`.
- In `resolveAndTrack()`, append them to the `targetUrl` as query parameters before returning the redirect destination.

---

### 16. Bulk Link Creation

**Problem:** Callers that need to create many links (e.g. importing a spreadsheet of URLs) must make one HTTP round-trip per link.

**What to do:**
- Add `POST /links/bulk` accepting `{ links: CreateLinkDto[] }` (capped at 50 per request).
- Return `{ created: ShortLinkResponse[], errors: { index, message }[] }` — partial success is fine.
- Use a Prisma `createMany()` for the DB write (single round-trip).

---

### 17. Max Clicks Limit

**Problem:** There is currently no way to expire a link after a certain number of clicks rather than after a certain time period.

**What to do:**
- Add `maxClicks Int?` to `ShortLink` (null = unlimited).
- In `resolveAndTrack()`, check `_count.clicks >= link.maxClicks` and throw `GoneException('Link has reached its click limit')`.
- Expose as an optional field in `CreateLinkDto`.
- Migration required.

---

## SUGGESTED ORDER OF WORK

1. **SSRF protection** — security gap, no schema change, low effort
2. **Database index** — performance fix, migration is safe and instant
3. **Configurable expiry** — small schema change, high utility
4. **Link update (PATCH)** — removes a major UX gap with no schema change
5. **Richer click events** — schema change; do this before analytics to avoid a second migration
6. **Analytics endpoint** — builds on item 5; makes click data actually useful
7. **Pagination** — needed before the list endpoint is used in production
8. **Enable/disable** — small schema change, high utility for campaigns
9. **One-time links** — small schema change, distinct feature
10. **QR codes** — no schema change, standalone feature
11. **Redirect type** — small schema change, affects caching behaviour
12. **Link preview** — no schema change, one new endpoint
13. **Password protection** — schema change, more complex logic
14. **Slug generation hardening** — code-only, low urgency
15. **UTM injection** — schema change, marketing use case
16. **Max clicks** — schema change, niche use case
17. **Bulk creation** — code-only, niche use case
