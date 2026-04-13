# Deploying Atlas to Railway

This is a NestJS monorepo with 4 services (gateway, auth-service, content-service, notification-service), PostgreSQL, and RabbitMQ. Each service is deployed as a separate Railway service within one Railway project.

> **Note:** The existing `Dockerfile.prod` is not service-aware — it hardcodes `node dist/main.js` which won't work for a monorepo. Step 1 has you create a Dockerfile per service before touching Railway.

---

## Step 1 — Create Per-Service Dockerfiles

Create the following four files at the root of the repo.

**`Dockerfile.gateway`**
```dockerfile
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm run build:gateway

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/apps/gateway/main.js"]
```

**`Dockerfile.auth`**
```dockerfile
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm run build:auth

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3001
CMD ["node", "dist/apps/auth-service/main.js"]
```

**`Dockerfile.content`**
```dockerfile
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm run build:content

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3002
CMD ["node", "dist/apps/content-service/main.js"]
```

**`Dockerfile.notification`**
```dockerfile
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm run build:notification

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/apps/notification-service/main.js"]
```

Commit and push all four Dockerfiles to `main` before proceeding.

---

## Step 2 — Create a Railway Project

1. Go to [railway.app](https://railway.app) and open your dashboard.
2. Click **New Project**.
3. Select **Empty Project**.
4. Name it `atlas`.

---

## Step 3 — Add PostgreSQL

1. Inside the atlas project, click **+ New Service**.
2. Select **Database → PostgreSQL**.
3. Railway provisions a Postgres instance and sets a `DATABASE_URL` variable automatically. You will reference this in auth-service and content-service.
4. Copy the `DATABASE_URL` from the Postgres service's **Variables** tab for use in Step 6.

---

## Step 4 — Add RabbitMQ

1. Click **+ New Service → Docker Image**.
2. Image: `rabbitmq:3-alpine`
3. Name the service `rabbitmq`.
4. Go to **Settings → Networking** and expose internal port `5672`.
5. The `RABBITMQ_URL` for other services will be:
   ```
   amqp://rabbitmq.railway.internal:5672
   ```

---

## Step 5 — Deploy Each Application Service

Deploy the 4 app services in this order (gateway last, since it depends on the others):

1. `auth-service`
2. `content-service`
3. `notification-service`
4. `gateway`

For each service:

1. Click **+ New Service → GitHub Repo** and select your atlas repository.
2. Go to **Settings → Build** and set **Dockerfile Path** to the matching file (e.g. `Dockerfile.auth`).
3. Set environment variables (see Step 6).
4. Click **Deploy**.

Only the gateway needs a public URL. Leave **Public Networking** off for all other services — Railway's internal network handles service-to-service communication.

For the gateway, go to **Settings → Networking → Generate Domain**. This gives you a public URL like `https://atlas-gateway.up.railway.app`.

---

## Step 6 — Environment Variables Per Service

Set these in each service's **Variables** tab.

**gateway**
```
GATEWAY_PORT=3000
AUTH_SERVICE_URL=http://auth-service.railway.internal:3001
CONTENT_SERVICE_URL=http://content-service.railway.internal:3002
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
```

**auth-service**
```
AUTH_SERVICE_PORT=3001
DATABASE_URL=<copy from Railway Postgres Variables tab>
JWT_ACCESS_SECRET=<same secret as gateway>
JWT_REFRESH_SECRET=<same secret as gateway>
RABBITMQ_URL=amqp://rabbitmq.railway.internal:5672
```

**content-service**
```
CONTENT_SERVICE_PORT=3002
DATABASE_URL=<same DATABASE_URL as auth-service>
```

**notification-service**
```
RABBITMQ_URL=amqp://rabbitmq.railway.internal:5672
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your Gmail address>
SMTP_PASS=<your Gmail app password>
SMTP_FROM=Atlas <no-reply@example.com>
```

> Railway internal hostnames follow the pattern `<service-name>.railway.internal`. The service name is whatever you named the service in the Railway UI — use lowercase and hyphens to match exactly.

---

## Step 7 — Run Prisma Migrations

Migrations must be run once against the Railway Postgres instance before auth-service or content-service will work.

**Option A — Railway CLI (recommended)**

```bash
npm install -g @railway/cli
railway login
railway link        # select your atlas project and auth-service when prompted
railway run npx prisma migrate deploy
```

**Option B — locally with Railway's connection string**

1. Copy `DATABASE_URL` from the Railway Postgres Variables tab.
2. Temporarily set it in your local `.env`.
3. Run `npx prisma migrate deploy`.
4. Restore your original `.env` afterwards.

> Do **not** run `prisma migrate dev` in production — always use `prisma migrate deploy`.

---

## Step 8 — Verify Deployment

Once all services are deployed and migrations have run, test the following against your gateway's public URL.

**Register**
```
POST /auth/register
Body: { "email": "test@example.com", "password": "password123" }
Expected: 201 with accessToken and refreshToken
```

**Login**
```
POST /auth/login
Body: { "email": "test@example.com", "password": "password123" }
Expected: 200 with new token pair
```

**Create content** (use accessToken from above)
```
POST /content
Authorization: Bearer <accessToken>
Body: { "title": "Hello", "body": "World" }
Expected: 201
```

Check Railway logs for notification-service to confirm the welcome email was triggered after registration.

---

## Troubleshooting

**Service won't start / crashes on boot**
- Check the service's **Logs** tab in Railway.
- Common cause: wrong Dockerfile path, or a missing environment variable.

**Prisma client not found**
- Ensure `COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma` is in the production stage of `Dockerfile.auth` and `Dockerfile.content`.
- Redeploy after fixing.

**Services can't reach each other**
- Confirm internal hostnames match the Railway service names exactly.
- Internal networking only works between services in the same Railway project.

**RabbitMQ connection refused**
- auth-service and notification-service will retry on startup. If RabbitMQ isn't ready, restart those services from the Railway dashboard after RabbitMQ is healthy. Railway has no built-in `depends_on` equivalent.

**DATABASE_URL format**
- Railway Postgres provides a URL starting with `postgresql://` — this is correct for Prisma's `@prisma/adapter-pg`. Do not change the format.
