# ---- Base ----
FROM node:20-alpine

# enable pnpm via corepack
RUN corepack enable

WORKDIR /app

# Copy dependency files first (cache layer)
COPY package.json pnpm-lock.yaml ./

# Install deps
RUN pnpm install

# Copy source
COPY . .

# Generate Prisma client (required before any TypeScript compilation)
RUN npx prisma generate

EXPOSE 3000

CMD ["pnpm", "run", "start:dev"]
