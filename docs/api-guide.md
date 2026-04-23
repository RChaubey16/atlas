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

## Setup in Postman

1. Open Postman and create a new **Collection** called `Atlas`.
2. For every request, set the header:
   - `Content-Type: application/json`
   - (Postman sets this automatically when you choose **Body → raw → JSON**)
3. After logging in or registering, copy the `accessToken` from the response. You will need it for all content endpoints — add it via the **Authorization** tab → **Bearer Token**.

> Google OAuth is a browser-only flow and cannot be tested with Postman's request builder.

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

## Content Endpoints

All content endpoints **require** authentication.

- **Browser clients** — cookies are sent automatically, no extra setup needed.
- **Postman / API clients** — add the `accessToken` as a Bearer token: **Authorization** tab → **Bearer Token** → paste your `accessToken`.

---

### 5. Create Content

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

---

### 6. Get My Content

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

### 7. Get Single Content Item

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

### 8. Create Short Link

Creates a new short link expiring in 30 days. Optionally supply a custom slug; if omitted, a random 6-character slug is generated.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/links` |
| **Auth** | Cookie or Bearer Token |

**Body (raw JSON):**
```json
{
  "targetUrl": "https://example.com/some/long/url",
  "slug": "my-link"
}
```

**Rules:**
- `targetUrl` must be a valid URL.
- `slug` is optional. If provided, must be 3–50 alphanumeric/hyphen characters (`[a-zA-Z0-9-]`).

**Success Response — `201 Created`:**
```json
{
  "slug": "my-link",
  "targetUrl": "https://example.com/some/long/url",
  "expiresAt": "2026-05-16T09:00:00.000Z",
  "createdAt": "2026-04-16T09:00:00.000Z",
  "clickCount": 0
}
```

**Error Responses:**

`400 Bad Request` — invalid URL or slug format:
```json
{
  "message": ["targetUrl must be a valid URL"],
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

`401 Unauthorized` — missing or invalid token.

---

### 9. List My Short Links

Returns all short links belonging to the authenticated user, newest first. Includes a `clickCount` for each link.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/links` |
| **Auth** | Cookie or Bearer Token |
| **Body** | None |

**Success Response — `200 OK`:**
```json
[
  {
    "slug": "my-link",
    "targetUrl": "https://example.com/some/long/url",
    "expiresAt": "2026-05-16T09:00:00.000Z",
    "createdAt": "2026-04-16T09:00:00.000Z",
    "clickCount": 12
  }
]
```

Returns an empty array `[]` if the user has no links yet.

---

### 10. Delete Short Link

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

### 11. Follow a Short Link (Public Redirect)

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

### 12. Send a Templated Email

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
Body: { "targetUrl": "https://example.com", "slug": "demo" }
```

**Step 7 — Follow the short link (open in browser or curl)**
```
GET /s/demo
```

**Step 8 — Check click count**
```
GET /links
Authorization: Bearer <accessToken>
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
| `/dummy/blogs` | GET | No | 5 hardcoded blogs for testing |
| `/dummy/users` | GET | No | 5 hardcoded fake users for testing |
| `/auth/register` | POST | No | Create account, returns token pair |
| `/auth/login` | POST | No | Login, returns token pair |
| `/auth/refresh` | POST | No | Swap refresh token for new token pair |
| `/auth/google` | GET | No | Initiate Google OAuth — pass `?redirect=<url>` (browser only) |
| `/auth/google/callback` | GET | No | Google OAuth callback — sets cookies, redirects to frontend |
| `/content` | POST | Yes | Create a content item |
| `/content` | GET | Yes | List all your content |
| `/content/:id` | GET | Yes | Get one content item by ID |
| `/links` | POST | Yes | Create a short link (30-day expiry) |
| `/links` | GET | Yes | List your short links with click counts |
| `/links/:slug` | DELETE | Yes | Delete a short link |
| `/s/:slug` | GET | No | Follow a short link (302 redirect) |
| `/notify/send` | POST | Yes | Send a templated email (`welcome`, `password-reset`, `feature-announcement`) |
