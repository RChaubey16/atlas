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

## Auth Endpoints

These endpoints do **not** require a token. Anyone can call them.

---

### 1. Register

Creates a new user account and returns tokens immediately.

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

### 3. Refresh Token

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

## Full Workflow — Step by Step

Follow this order to test the entire system end to end:

**Step 1 — Register**
```
POST /auth/register
Body: { "email": "test@example.com", "password": "password123" }
```
Copy the `accessToken` and `refreshToken` from the response.

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

---

## Quick Reference

| Endpoint | Method | Auth Required | Purpose |
|---|---|---|---|
| `/auth/register` | POST | No | Create account, get tokens |
| `/auth/login` | POST | No | Login, get tokens |
| `/auth/refresh` | POST | No | Swap refresh token for new tokens |
| `/content` | POST | Yes | Create a content item |
| `/content` | GET | Yes | List all your content |
| `/content/:id` | GET | Yes | Get one content item by ID |
