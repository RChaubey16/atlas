# Atlas API — Postman Guide

All requests go through the **Gateway** only. Never call auth-service or content-service directly.

**Base URL:** `http://localhost:3000`

---

## Setup in Postman

1. Open Postman and create a new **Collection** called `Atlas`.
2. For every request, set the header:
   - `Content-Type: application/json`
   - (Postman sets this automatically when you choose **Body → raw → JSON**)
3. After logging in or registering, copy the `accessToken` from the response. You will need it for all content endpoints.

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

Creates a new user account and returns tokens immediately. A welcome email is sent asynchronously via the Notification Service — this happens in the background and does not delay the response.

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

---

### 3. Google OAuth — Sign In with Google

Google OAuth is a browser-based flow. You cannot test it with Postman's request builder — open the URL directly in a browser.

#### Step 1 — Initiate login

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/auth/google` |
| **Auth** | None |
| **Body** | None |

Opening this URL in a browser triggers a `302` redirect to Google's consent screen. No response body is returned directly.

#### Step 2 — Google redirects back

After you authenticate on Google, the browser is redirected to:

```
GET /auth/google/callback?code=...
```

The Gateway handles this automatically. You do not call this endpoint manually.

**Success Response — `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Use these tokens exactly like the ones returned by `/auth/register` and `/auth/login`.

**Account linking behaviour:**
- If the Google email matches an existing email/password account, the Google ID is linked to that account — no duplicate user is created.
- If no account exists, a new one is created and a welcome email is sent.
- Google-only accounts have no password and cannot log in via `POST /auth/login`.

---

### 4. Refresh Token

The `accessToken` expires after **15 minutes**. Use this endpoint to get a new pair of tokens using your `refreshToken` (valid for 7 days) — without logging in again.

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

All content endpoints **require** a valid `accessToken`. Add it to every request as a header:

| Header | Value |
|---|---|
| `Authorization` | `Bearer <your_accessToken_here>` |

**In Postman:** Go to the **Authorization** tab → select **Bearer Token** → paste your `accessToken`.

---

### 4. Create Content

Creates a new content item owned by the authenticated user.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/content` |
| **Auth** | Bearer Token (accessToken) |

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

### 5. Get My Content

Returns all content items belonging to the authenticated user, newest first.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/content` |
| **Auth** | Bearer Token (accessToken) |
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
  },
  {
    "id": "d4e5f6a7-b8c9-0123-def0-456789abcdef",
    "title": "Another Post",
    "body": "More content here.",
    "ownerId": "b1c2d3e4-f5a6-7890-abcd-123456789abc",
    "createdAt": "2026-04-07T09:00:00.000Z"
  }
]
```

Returns an empty array `[]` if the user has no content yet.

---

### 6. Get Single Content Item

Returns one content item by its ID. Only works if the item belongs to the authenticated user.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/content/:id` |
| **Auth** | Bearer Token (accessToken) |
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

Short link management endpoints **require** a valid `accessToken`. The public redirect endpoint does not.

---

### 7. Create Short Link

Creates a new short link expiring in 30 days. Optionally supply a custom slug; if omitted, a random 6-character slug is generated.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/links` |
| **Auth** | Bearer Token (accessToken) |

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

### 8. List My Short Links

Returns all short links belonging to the authenticated user, newest first. Includes a `clickCount` for each link.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/links` |
| **Auth** | Bearer Token (accessToken) |
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

### 9. Delete Short Link

Deletes one of the authenticated user's short links by slug.

| | |
|---|---|
| **Method** | `DELETE` |
| **URL** | `http://localhost:3000/links/:slug` |
| **Auth** | Bearer Token (accessToken) |
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

### 10. Follow a Short Link (Public Redirect)

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

## Full Workflow — Step by Step

Follow this order to test the entire system end to end:

**Step 0 — Verify the API is up (no auth needed)**
```
GET /dummy/blogs
```
If you get back a JSON array of 5 blogs, the stack is running correctly.

**Step 1 — Register**
```
POST /auth/register
Body: { "email": "test@example.com", "password": "password123" }
```
Copy the `accessToken` and `refreshToken` from the response. A welcome email will be sent to the address you registered with (requires `RESEND_API_KEY` to be configured).

**Step 2 — Create some content**
```
POST /content
Authorization: Bearer <accessToken>
Body: { "title": "Hello World", "body": "My first post." }
```
Copy the `id` from the response.

**Step 3 — Fetch all your content**
```
GET /content
Authorization: Bearer <accessToken>
```
You should see the item you just created.

**Step 4 — Fetch one item by ID**
```
GET /content/<id>
Authorization: Bearer <accessToken>
```

**Step 5 — Simulate token expiry and refresh**
```
POST /auth/refresh
Body: { "refreshToken": "<your refreshToken>" }
```
Use the new `accessToken` for subsequent requests.

**Step 6 — Create a short link**
```
POST /links
Authorization: Bearer <accessToken>
Body: { "targetUrl": "https://example.com", "slug": "demo" }
```
Copy the `slug` from the response.

**Step 7 — Follow the short link (open in browser or curl)**
```
GET /s/demo
```
You will be redirected to `https://example.com`. No token needed.

**Step 8 — Check click count**
```
GET /links
Authorization: Bearer <accessToken>
```
The `clickCount` on your link should now be `1`.

**Step 9 — Delete the short link**
```
DELETE /links/demo
Authorization: Bearer <accessToken>
```

---

## Quick Reference

| Endpoint | Method | Auth Required | Purpose |
|---|---|---|---|
| `/dummy/blogs` | GET | No | 5 hardcoded blogs for testing |
| `/dummy/users` | GET | No | 5 hardcoded fake users for testing |
| `/auth/register` | POST | No | Create account, get tokens |
| `/auth/login` | POST | No | Login, get tokens |
| `/auth/refresh` | POST | No | Swap refresh token for new tokens |
| `/auth/google` | GET | No | Initiate Google OAuth (browser only) |
| `/auth/google/callback` | GET | No | Google OAuth callback — handled automatically |
| `/content` | POST | Yes | Create a content item |
| `/content` | GET | Yes | List all your content |
| `/content/:id` | GET | Yes | Get one content item by ID |
| `/links` | POST | Yes | Create a short link (30-day expiry) |
| `/links` | GET | Yes | List your short links with click counts |
| `/links/:slug` | DELETE | Yes | Delete a short link |
| `/s/:slug` | GET | No | Follow a short link (302 redirect) |
