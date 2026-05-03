# Atlas API — Postman Guide

All requests go through the **Gateway** only. Never call auth-service or content-service directly.

**Base URL:** `http://localhost:3000`

---

## Authentication — Two Modes

Atlas supports two ways to authenticate, depending on the client type:

| Client | How tokens are sent | How to authenticate |
|---|---|---|
| **Browser (SPA/frontend)** | `httpOnly` cookies set automatically | Use Google OAuth or login — cookies are sent with every request |
| **API client (Postman, curl)** | `Authorization: Bearer <token>` header | Copy the `accessToken` from the login/register response and add it manually |

The gateway accepts **both** on every protected route — cookies are checked first, then the `Authorization` header.

---

## Rate Limits

The gateway enforces rate limits to prevent abuse. Exceeding any limit returns `429 Too Many Requests`.

| Endpoint | Limit | Window | Tracked by |
|---|---|---|---|
| `POST /auth/login` | 5 requests | 60 s | IP address |
| `POST /auth/register` | 5 requests | 60 s | IP address |
| `POST /content` | 20 requests | 60 s | Authenticated user ID |
| `POST /links` | 20 requests | 60 s | Authenticated user ID |
| All other routes | 100 requests | 60 s | IP address |

---

## Setup in Postman

1. Open Postman and create a new **Collection** called `Atlas`.
2. For every request, set the header:
   - `Content-Type: application/json`
   - (Postman sets this automatically when you choose **Body → raw → JSON**)
3. After logging in or registering, copy the `accessToken` from the response. You will need it for all content endpoints — add it via the **Authorization** tab → **Bearer Token**.

> Google OAuth is a browser-only flow and cannot be tested with Postman's request builder.

### Swagger UI

The gateway serves an interactive API explorer at `http://localhost:3000/docs`. Every endpoint, request body shape, and expected response is listed there — useful for quick exploration without setting up Postman. Bearer token auth is supported directly in the UI via the **Authorize** button.

---

## Health Endpoints

Health endpoints are **fully public** — no token required. Use them to verify the stack is running before making other requests.

---

### Gateway Liveness

Returns the gateway's uptime and current timestamp. Does not check any downstream service — always responds as long as the gateway process is alive.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/health` |
| **Auth** | None |

**Success Response — `200 OK`:**
```json
{
  "status": "ok",
  "uptime": 42,
  "timestamp": "2026-05-02T10:00:00.000Z"
}
```

---

### Gateway Readiness

Pings the Auth Service, Content Service, and URL Shortener Service. Returns a detailed status object for each downstream dependency. Use this to confirm the entire stack is reachable before running tests.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/health/ready` |
| **Auth** | None |

**Success Response — `200 OK`:**
```json
{
  "status": "ok",
  "info": {
    "auth-service": { "status": "up" },
    "content-service": { "status": "up" },
    "url-shortener": { "status": "up" }
  },
  "error": {},
  "details": {
    "auth-service": { "status": "up" },
    "content-service": { "status": "up" },
    "url-shortener": { "status": "up" }
  }
}
```

**Error Response — `503 Service Unavailable`:** returned when one or more downstream services are unreachable; the `error` field identifies which ones failed.

---

## Dummy Endpoints

These endpoints are **fully public** — no account, no token, no setup required. Use them to quickly test your HTTP client or verify the API is reachable.

---

### 1. Get Dummy Blogs

Returns 5 hardcoded blog entries.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/dummy/blogs` |
| **Auth** | None |
| **Body** | None |

**Success Response — `200 OK`:**
```json
[
  {
    "id": "1",
    "title": "Getting Started with NestJS",
    "body": "NestJS is a progressive Node.js framework...",
    "author": "Jane Doe",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
]
```

---

### 2. Get Dummy Users

Returns 5 hardcoded fake user entries.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/dummy/users` |
| **Auth** | None |
| **Body** | None |

**Success Response — `200 OK`:**
```json
[
  {
    "id": "1",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "avatarUrl": "https://i.pravatar.cc/150?img=1"
  }
]
```

---

## Auth Endpoints

These endpoints do **not** require a token. Anyone can call them.

---

### 1. Register

Creates a new user account and returns tokens. A welcome email is sent asynchronously via the Notification Service.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/auth/register` |
| **Auth** | None |

**Body (raw JSON):**
```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Rules:**
- `email` must be a valid email format.
- `password` must be at least 8 characters.

**Success Response — `201 Created`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

`400 Bad Request` — validation failed (bad email, password too short):
```json
{
  "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request",
  "statusCode": 400
}
```

`409 Conflict` — email already registered:
```json
{
  "message": "Email already in use",
  "error": "Conflict",
  "statusCode": 409
}
```

`429 Too Many Requests` — more than 5 attempts in 60 s from the same IP.

---

### 2. Login

Authenticates an existing user and returns fresh tokens.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/auth/login` |
| **Auth** | None |

**Body (raw JSON):**
```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Success Response — `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

`401 Unauthorized` — wrong email or password:
```json
{
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "statusCode": 401
}
```

`429 Too Many Requests` — more than 5 attempts in 60 s from the same IP.

> **Note:** Google-only accounts (no password set) will also return `401` here. Use Google OAuth instead.

---

### 3. Google OAuth — Sign In with Google

Google OAuth is a **browser-only** flow. Open the URL in a browser — do not use Postman's request builder.

#### Step 1 — Initiate login

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/auth/google` |
| **Auth** | None |
| **Body** | None |

Pass a `?redirect=` query parameter to control where the browser lands after authentication:

```
http://localhost:3000/auth/google?redirect=https://links.ruturaj.xyz
```

If omitted, the browser is redirected to the `FRONTEND_URL` configured on the server.

The gateway issues a `302` redirect to Google's consent screen. Nothing is returned to the caller directly.

#### Step 2 — Google redirects back (automatic)

After you authenticate on Google, the browser is automatically redirected to:

```
GET /auth/google/callback?code=...&state=<your-redirect-url>
```

You do not call this endpoint manually — the browser follows the redirect from Google.

**What happens next:**
1. The gateway validates the Google profile.
2. Two `httpOnly` cookies are set on `.ruturaj.xyz`:
   - `access_token` — expires in **15 minutes**
   - `refresh_token` — expires in **7 days**
3. The browser is redirected to the URL you passed in `?redirect=`.

From this point, the browser sends both cookies automatically with every request to any `*.ruturaj.xyz` subdomain — no manual token handling required.

**Account linking behaviour:**
- Found by Google ID → returns existing user.
- Google email matches an existing email/password account → links the Google ID to that account.
- No match → creates a new user and sends a welcome email.

---

### 4. Refresh Token

The `access_token` (cookie) or `accessToken` (JSON) expires after **15 minutes**. Use this endpoint to get a new pair without logging in again.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/auth/refresh` |
| **Auth** | None |

**Body (raw JSON):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response — `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response:**

`401 Unauthorized` — token is expired or tampered with:
```json
{
  "message": "Invalid refresh token",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

### 5. Logout

Clears the `access_token` and `refresh_token` cookies set by the gateway. After this call any subsequent cookie-based request from the same browser will be rejected as unauthenticated.

> **Note:** This endpoint only clears cookies. The JWT itself is not invalidated server-side — it remains cryptographically valid until it expires (15 minutes). If you received tokens as JSON (Postman / API clients), simply discard them client-side.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/auth/logout` |
| **Auth** | None required |
| **Body** | None |

**Success Response — `200 OK`:**
```json
{
  "success": true
}
```

---

## Content Endpoints

All content endpoints **require** authentication.

- **Browser clients** — cookies are sent automatically, no extra setup needed.
- **Postman / API clients** — add the `accessToken` as a Bearer token: **Authorization** tab → **Bearer Token** → paste your `accessToken`.

---

### 6. Create Content

Creates a new content item owned by the authenticated user.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/content` |
| **Auth** | Cookie or Bearer Token |

**Body (raw JSON):**
```json
{
  "title": "My First Post",
  "body": "This is the content of my first post."
}
```

**Rules:**
- `title` must be a non-empty string.
- `body` must be a string (can be empty).

**Success Response — `201 Created`:**
```json
{
  "id": "a3f1c2d4-5e6f-7890-abcd-ef1234567890",
  "title": "My First Post",
  "body": "This is the content of my first post.",
  "ownerId": "b1c2d3e4-f5a6-7890-abcd-123456789abc",
  "createdAt": "2026-04-07T10:30:00.000Z"
}
```

**Error Responses:**

`401 Unauthorized` — missing or invalid token:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

`400 Bad Request` — missing or invalid fields:
```json
{
  "message": ["title must be longer than or equal to 1 characters"],
  "error": "Bad Request",
  "statusCode": 400
}
```

`429 Too Many Requests` — more than 20 creations in 60 s by the same user.

---

### 7. Get My Content

Returns all content items belonging to the authenticated user, newest first.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/content` |
| **Auth** | Cookie or Bearer Token |
| **Body** | None |

**Success Response — `200 OK`:**
```json
[
  {
    "id": "a3f1c2d4-5e6f-7890-abcd-ef1234567890",
    "title": "My First Post",
    "body": "This is the content of my first post.",
    "ownerId": "b1c2d3e4-f5a6-7890-abcd-123456789abc",
    "createdAt": "2026-04-07T10:30:00.000Z"
  }
]
```

Returns an empty array `[]` if the user has no content yet.

---

### 8. Get Single Content Item

Returns one content item by its ID. Only works if the item belongs to the authenticated user.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/content/:id` |
| **Auth** | Cookie or Bearer Token |
| **Body** | None |

**Example URL:** `http://localhost:3000/content/a3f1c2d4-5e6f-7890-abcd-ef1234567890`

**Success Response — `200 OK`:**
```json
{
  "id": "a3f1c2d4-5e6f-7890-abcd-ef1234567890",
  "title": "My First Post",
  "body": "This is the content of my first post.",
  "ownerId": "b1c2d3e4-f5a6-7890-abcd-123456789abc",
  "createdAt": "2026-04-07T10:30:00.000Z"
}
```

**Error Responses:**

`404 Not Found` — no content exists with that ID:
```json
{
  "message": "Content not found",
  "error": "Not Found",
  "statusCode": 404
}
```

`403 Forbidden` — the content exists but belongs to a different user:
```json
{
  "message": "Forbidden",
  "statusCode": 403
}
```

---

## URL Shortener Endpoints

Short link management endpoints **require** authentication. The public redirect endpoint does not.

- **Browser clients** — cookies sent automatically.
- **Postman / API clients** — use `Authorization: Bearer <accessToken>`.

---

### 9. Create Short Link

Creates a new short link. Optionally supply a custom slug and control when the link expires. If neither `expiresInDays` nor `noExpiry` is given, the link expires after 30 days.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/links` |
| **Auth** | Cookie or Bearer Token |

**Body (raw JSON):**
```json
{
  "targetUrl": "https://example.com/some/long/url",
  "slug": "my-link",
  "expiresInDays": 7,
  "noExpiry": false
}
```

**Fields:**
- `targetUrl` — required, must be a valid public URL. URLs resolving to private/loopback addresses are rejected.
- `slug` — optional, 3–50 alphanumeric/hyphen characters. Auto-generated (6 chars) if omitted.
- `expiresInDays` — optional integer 1–365. Defaults to 30 when omitted and `noExpiry` is false.
- `noExpiry` — optional boolean. Set to `true` to create a link that never expires (`expiresAt` will be `null` in the response).

**Success Response — `201 Created`:**
```json
{
  "slug": "my-link",
  "targetUrl": "https://example.com/some/long/url",
  "expiresAt": "2026-05-09T09:00:00.000Z",
  "createdAt": "2026-05-02T09:00:00.000Z",
  "clickCount": 0
}
```

`expiresAt` is `null` when `noExpiry: true` was passed.

**Error Responses:**

`400 Bad Request` — invalid URL, slug format, or private/loopback target:
```json
{
  "message": "targetUrl must not point to a private or loopback address",
  "error": "Bad Request",
  "statusCode": 400
}
```

`409 Conflict` — custom slug already taken:
```json
{
  "message": "Slug already in use",
  "error": "Conflict",
  "statusCode": 409
}
```

`429 Too Many Requests` — more than 20 creations in 60 s by the same user.

`401 Unauthorized` — missing or invalid token.

---

### 10. List My Short Links

Returns a paginated list of short links belonging to the authenticated user, newest first. Includes a `clickCount` for each link.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/links` |
| **Auth** | Cookie or Bearer Token |
| **Body** | None |

**Query Parameters:**

| Parameter | Type | Default | Max | Description |
|---|---|---|---|---|
| `page` | integer | `1` | — | Page number (1-based) |
| `limit` | integer | `20` | `100` | Items per page |

**Example URL:** `http://localhost:3000/links?page=2&limit=10`

**Success Response — `200 OK`:**
```json
{
  "data": [
    {
      "slug": "my-link",
      "targetUrl": "https://example.com/some/long/url",
      "expiresAt": "2026-05-09T09:00:00.000Z",
      "createdAt": "2026-05-02T09:00:00.000Z",
      "clickCount": 12
    }
  ],
  "total": 42,
  "page": 1,
  "pages": 3
}
```

`expiresAt` is `null` for never-expiring links. `data` is an empty array `[]` when the user has no links.

---

### 11. Update Short Link

Updates the target URL and/or expiry of an existing link. The slug itself cannot be changed. At least one field must be provided.

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `http://localhost:3000/links/:slug` |
| **Auth** | Cookie or Bearer Token |

**Example URL:** `http://localhost:3000/links/my-link`

**Body (raw JSON):**
```json
{
  "targetUrl": "https://example.com/new-destination",
  "expiresInDays": 14
}
```

**Fields (all optional, at least one required):**
- `targetUrl` — new destination URL. Same SSRF validation as create.
- `expiresInDays` — extend or shorten expiry to this many days from now (1–365).
- `noExpiry` — set to `true` to remove the expiry (`expiresAt` becomes `null`).

> Note: sending `noExpiry: false` without `expiresInDays` leaves the current `expiresAt` unchanged. To reset to 30 days, send `expiresInDays: 30`.

**Success Response — `200 OK`:**
```json
{
  "slug": "my-link",
  "targetUrl": "https://example.com/new-destination",
  "expiresAt": "2026-05-16T09:00:00.000Z",
  "createdAt": "2026-05-02T09:00:00.000Z",
  "clickCount": 5
}
```

**Error Responses:**

`400 Bad Request` — no fields provided, invalid URL, or private/loopback target.

`403 Forbidden` — the link belongs to a different user.

`404 Not Found` — no link with that slug.

`401 Unauthorized` — missing or invalid token.

---

### 12. Link Click Analytics

Returns click statistics for one of the authenticated user's links. Includes a 30-day daily breakdown.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/links/:slug/analytics` |
| **Auth** | Cookie or Bearer Token |
| **Body** | None |

**Example URL:** `http://localhost:3000/links/my-link/analytics`

**Success Response — `200 OK`:**
```json
{
  "totalClicks": 47,
  "clicksByDay": [
    { "date": "2026-04-25", "count": 3 },
    { "date": "2026-04-26", "count": 11 },
    { "date": "2026-05-01", "count": 7 }
  ],
  "lastClickedAt": "2026-05-01T18:43:00.000Z"
}
```

`clicksByDay` lists only days that had at least one click, in ascending date order, for the last 30 days. `lastClickedAt` is `null` if the link has never been clicked.

**Error Responses:**

`403 Forbidden` — the link belongs to a different user.

`404 Not Found` — no link with that slug.

`401 Unauthorized` — missing or invalid token.

---

### 13. Delete Short Link

Deletes one of the authenticated user's short links by slug.

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `http://localhost:3000/links/:slug` |
| **Auth** | Cookie or Bearer Token |
| **Body** | None |

**Example URL:** `http://localhost:3000/links/my-link`

**Success Response — `200 OK`** (empty body)

**Error Responses:**

`404 Not Found` — no link exists with that slug:
```json
{
  "message": "Short link not found",
  "error": "Not Found",
  "statusCode": 404
}
```

`403 Forbidden` — the link exists but belongs to a different user.

`401 Unauthorized` — missing or invalid token.

---

### 14. Follow a Short Link (Public Redirect)

Resolves a slug and issues a `302` redirect to the target URL. No authentication required. Each visit increments the click counter. Expired links return `410 Gone`.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/s/:slug` |
| **Auth** | None |
| **Body** | None |

**Example URL:** `http://localhost:3000/s/my-link`

**Success Response — `302 Found`:**
```
Location: https://example.com/some/long/url
```

Browsers and HTTP clients that follow redirects will land directly on the target URL.

**Error Responses:**

`404 Not Found` — slug does not exist:
```json
{
  "message": "Short link not found",
  "error": "Not Found",
  "statusCode": 404
}
```

`410 Gone` — link existed but has expired:
```json
{
  "message": "Link has expired",
  "error": "Gone",
  "statusCode": 410
}
```

---

## Notification Endpoints

Notification endpoints **require** authentication.

- **Browser clients** — cookies sent automatically.
- **Postman / API clients** — use `Authorization: Bearer <accessToken>`.

---

### 15. Send a Templated Email

Sends an email to one or more recipients using a named template. The gateway forwards the request to the Notification Service over an internal channel — callers only need a valid JWT.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/notify/send` |
| **Auth** | Cookie or Bearer Token |

**Available template IDs:**

| `templateId` | Required `templateData` fields | Optional fields |
|---|---|---|
| `welcome` | `email` | — |
| `password-reset` | `email`, `resetLink` | — |
| `feature-announcement` | `email`, `featureName`, `description` | `ctaLabel`, `ctaUrl` |

> `email` is automatically set to each recipient address and does not need to be included in `templateData`.

**Body (raw JSON):**
```json
{
  "templateId": "password-reset",
  "to": ["alice@example.com"],
  "templateData": {
    "resetLink": "https://app.example.com/reset?token=abc123"
  }
}
```

**Success Response — `200 OK`:**
```json
{
  "sent": 1
}
```

**Error Responses:**

`404 Not Found` — unknown `templateId`:
```json
{
  "message": "Email template \"unknown-template\" not found",
  "error": "Not Found",
  "statusCode": 404
}
```

`401 Unauthorized` — missing or invalid token.

---

## User Template Endpoints

User template endpoints **require** authentication. They manage custom HTML email templates that are stored per-user in the database.

- **Browser clients** — cookies sent automatically.
- **Postman / API clients** — use `Authorization: Bearer <accessToken>`.

---

### 18. Create a Custom Email Template

Stores a new custom email template owned by the authenticated user.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/user-templates` |
| **Auth** | Cookie or Bearer Token |

**Body (raw JSON):**
```json
{
  "name": "My Promo Template",
  "subject": "Special offer just for you",
  "html": "<h1>Hello!</h1><p>Check out our latest deals.</p>"
}
```

**Fields:**
- `name` — required, max 100 characters. A label to identify the template in your list.
- `subject` — required, max 255 characters. The email subject line.
- `html` — required. The full HTML body of the email.

**Success Response — `201 Created`:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "b1c2d3e4-f5a6-7890-abcd-123456789abc",
  "name": "My Promo Template",
  "subject": "Special offer just for you",
  "html": "<h1>Hello!</h1><p>Check out our latest deals.</p>",
  "createdAt": "2026-05-03T10:00:00.000Z",
  "updatedAt": "2026-05-03T10:00:00.000Z"
}
```

**Error Responses:**

`400 Bad Request` — validation failed (missing field, name too long, etc.).

`401 Unauthorized` — missing or invalid token.

---

### 19. List My Custom Templates

Returns all custom templates owned by the authenticated user, newest first.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/user-templates` |
| **Auth** | Cookie or Bearer Token |
| **Body** | None |

**Success Response — `200 OK`:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "b1c2d3e4-f5a6-7890-abcd-123456789abc",
    "name": "My Promo Template",
    "subject": "Special offer just for you",
    "html": "<h1>Hello!</h1><p>Check out our latest deals.</p>",
    "createdAt": "2026-05-03T10:00:00.000Z",
    "updatedAt": "2026-05-03T10:00:00.000Z"
  }
]
```

Returns an empty array `[]` if the user has no custom templates.

---

### 20. Get One Custom Template

Returns a single custom template by ID. Only succeeds if the template belongs to the authenticated user.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/user-templates/:id` |
| **Auth** | Cookie or Bearer Token |
| **Body** | None |

**Example URL:** `http://localhost:3000/user-templates/a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Success Response — `200 OK`:** same shape as a single object from the list response.

**Error Responses:**

`404 Not Found` — no template with that ID, or it belongs to a different user.

`401 Unauthorized` — missing or invalid token.

---

### 21. Delete a Custom Template

Deletes one of the authenticated user's custom templates. Returns no body on success.

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `http://localhost:3000/user-templates/:id` |
| **Auth** | Cookie or Bearer Token |
| **Body** | None |

**Example URL:** `http://localhost:3000/user-templates/a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Success Response — `204 No Content`** (empty body)

**Error Responses:**

`404 Not Found` — no template with that ID, or it belongs to a different user.

`401 Unauthorized` — missing or invalid token.

---

## Template Endpoints

Template endpoints are **public** — no authentication required. Use them to display the available email templates and preview their rendered HTML.

---

### 22. List Available Templates

Returns every email template in the system along with its field definitions.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/templates` |
| **Auth** | None |
| **Body** | None |

**Success Response — `200 OK`:**
```json
[
  {
    "id": "welcome",
    "name": "Welcome",
    "description": "Sent to new users after successful registration.",
    "subject": "Welcome to Atlas!",
    "fields": [
      { "name": "email", "required": true, "description": "Recipient email address" }
    ]
  },
  {
    "id": "password-reset",
    "name": "Password Reset",
    "description": "Sent when a user requests a password reset.",
    "subject": "Reset your Atlas password",
    "fields": [
      { "name": "email", "required": true, "description": "Recipient email address" },
      { "name": "resetLink", "required": true, "description": "URL the user clicks to reset their password" }
    ]
  },
  {
    "id": "feature-announcement",
    "name": "Feature Announcement",
    "description": "Announces a new product feature to users.",
    "subject": "What's new in Atlas",
    "fields": [
      { "name": "email", "required": true, "description": "Recipient email address" },
      { "name": "featureName", "required": true, "description": "Name of the new feature" },
      { "name": "description", "required": true, "description": "Short description of the feature" },
      { "name": "ctaLabel", "required": false, "description": "Call-to-action button label" },
      { "name": "ctaUrl", "required": false, "description": "Call-to-action button URL" }
    ]
  }
]
```

---

### 23. Preview a Template

Renders a specific template using its built-in sample data and returns the HTML. The `email` field in the preview response shows what the recipient would actually see.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/templates/:id/preview` |
| **Auth** | None |
| **Body** | None |

**Example URL:** `http://localhost:3000/templates/password-reset/preview`

**Success Response — `200 OK`:**
```json
{
  "id": "password-reset",
  "subject": "Reset your Atlas password",
  "html": "<h1>Reset your password</h1><p>Hi alice@example.com,</p>..."
}
```

**Error Response:**

`404 Not Found` — unknown template ID:
```json
{
  "message": "Template \"unknown\" not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Full Workflow — Step by Step

### API client (Postman)

**Step 0 — Verify the API is up**
```
GET /dummy/blogs
```
If you get back a JSON array of 5 blogs, the stack is running correctly.

**Step 1 — Register**
```
POST /auth/register
Body: { "email": "test@example.com", "password": "password123" }
```
Copy the `accessToken` from the response.

**Step 2 — Create content**
```
POST /content
Authorization: Bearer <accessToken>
Body: { "title": "Hello World", "body": "My first post." }
```

**Step 3 — Fetch all your content**
```
GET /content
Authorization: Bearer <accessToken>
```

**Step 4 — Fetch one item by ID**
```
GET /content/<id>
Authorization: Bearer <accessToken>
```

**Step 5 — Refresh tokens**
```
POST /auth/refresh
Body: { "refreshToken": "<your refreshToken>" }
```

**Step 6 — Create a short link**
```
POST /links
Authorization: Bearer <accessToken>
Body: { "targetUrl": "https://example.com", "slug": "demo", "expiresInDays": 7 }
```

Pass `"noExpiry": true` instead of `expiresInDays` to create a link that never expires.

**Step 7 — Follow the short link (open in browser or curl)**
```
GET /s/demo
```

**Step 8 — Check click count and list links (paginated)**
```
GET /links?page=1&limit=20
Authorization: Bearer <accessToken>
```

Returns `{ data: [...], total, page, pages }`.

**Step 8b — View detailed analytics**
```
GET /links/demo/analytics
Authorization: Bearer <accessToken>
```

Returns `{ totalClicks, clicksByDay, lastClickedAt }`.

**Step 8c — Update the link's destination**
```
PATCH /links/demo
Authorization: Bearer <accessToken>
Body: { "targetUrl": "https://example.com/updated" }
```

**Step 9 — Delete the short link**
```
DELETE /links/demo
Authorization: Bearer <accessToken>
```

**Step 10 — Send a templated email**
```
POST /notify/send
Authorization: Bearer <accessToken>
Body: {
  "templateId": "feature-announcement",
  "to": ["test@example.com"],
  "templateData": {
    "featureName": "URL Shortener",
    "description": "You can now create short links with click tracking.",
    "ctaLabel": "Try it now",
    "ctaUrl": "http://localhost:3000/links"
  }
}
```

**Step 11 — List built-in templates (no auth needed)**
```
GET /templates
```
Returns all built-in template IDs, names, descriptions, subjects, and field definitions — useful for populating a template picker UI.

**Step 12 — Preview a built-in template (no auth needed)**
```
GET /templates/feature-announcement/preview
```
Returns rendered HTML using built-in sample data so you can see exactly what the email looks like before sending.

**Step 12b — Create a custom email template**
```
POST /user-templates
Authorization: Bearer <accessToken>
Body: { "name": "My Template", "subject": "Hello!", "html": "<h1>Hi there</h1>" }
```
Returns the saved template with its `id`. Use `GET /user-templates` to list all your templates, `GET /user-templates/:id` to fetch one, and `DELETE /user-templates/:id` to remove it.

**Step 13 — Log out**
```
POST /auth/logout
```
Clears the `access_token` and `refresh_token` cookies. The server returns `{ "success": true }`. Further requests using those cookies will be rejected with `401 Unauthorized`.

---

### Browser client (Google OAuth)

**Step 1 — Initiate Google login from your frontend**
```
window.location.href = 'https://atlas.ruturaj.xyz/auth/google?redirect=https://links.ruturaj.xyz'
```

**Step 2 — Authenticate on Google**

Google redirects back to the gateway, which sets `access_token` and `refresh_token` cookies on `.ruturaj.xyz` and redirects the browser to `https://links.ruturaj.xyz`.

**Step 3 — Make authenticated requests from the frontend**

No token handling needed — the browser sends the cookies automatically:
```js
fetch('https://atlas.ruturaj.xyz/links', { credentials: 'include' })
```

The `credentials: 'include'` option is required for cross-origin cookie sending.

---

## Quick Reference

| Endpoint | Method | Auth Required | Purpose |
|---|---|---|---|
| `/health` | GET | No | Gateway liveness — uptime and timestamp |
| `/health/ready` | GET | No | Gateway readiness — pings all downstream services |
| `/docs` | GET | No | Swagger / OpenAPI interactive explorer |
| `/dummy/blogs` | GET | No | 5 hardcoded blogs for testing |
| `/dummy/users` | GET | No | 5 hardcoded fake users for testing |
| `/auth/register` | POST | No | Create account, returns token pair |
| `/auth/login` | POST | No | Login, returns token pair |
| `/auth/refresh` | POST | No | Swap refresh token for new token pair |
| `/auth/logout` | POST | No | Clear `access_token` and `refresh_token` cookies |
| `/auth/google` | GET | No | Initiate Google OAuth — pass `?redirect=<url>` (browser only) |
| `/auth/google/callback` | GET | No | Google OAuth callback — sets cookies, redirects to frontend |
| `/content` | POST | Yes | Create a content item |
| `/content` | GET | Yes | List all your content |
| `/content/:id` | GET | Yes | Get one content item by ID |
| `/links` | POST | Yes | Create a short link (`expiresInDays` 1–365, `noExpiry`, optional custom `slug`) |
| `/links` | GET | Yes | List your short links — paginated (`?page=1&limit=20`), returns `{ data, total, page, pages }` |
| `/links/:slug` | PATCH | Yes | Update `targetUrl` and/or expiry of an existing link |
| `/links/:slug/analytics` | GET | Yes | Click analytics — `totalClicks`, 30-day daily breakdown, `lastClickedAt` |
| `/links/:slug` | DELETE | Yes | Delete a short link |
| `/s/:slug` | GET | No | Follow a short link (302 redirect) |
| `/notify/send` | POST | Yes | Send a templated email (`welcome`, `password-reset`, `feature-announcement`) |
| `/user-templates` | POST | Yes | Create a custom email template (name, subject, html) |
| `/user-templates` | GET | Yes | List your custom email templates |
| `/user-templates/:id` | GET | Yes | Get one custom template by ID |
| `/user-templates/:id` | DELETE | Yes | Delete a custom template (204 No Content) |
| `/templates` | GET | No | List all built-in email templates with field metadata |
| `/templates/:id/preview` | GET | No | Render a built-in template with sample data, returns `{ id, subject, html }` |
