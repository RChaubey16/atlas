# NestJS Microservices Portfolio --- MVP (Auth + Content Only)

## Overview

This MVP focuses on building a **minimal but realistic microservices
backend** using NestJS.

Only two core services are included:

-   Authentication Service
-   Content Service

The goal is to demonstrate:

-   Microservice boundaries
-   API Gateway pattern
-   Event contracts
-   Clean architecture
-   Production-style structure

Additional services (notifications, jobs, analytics) can be added later.

------------------------------------------------------------------------

## Architecture

Client → API Gateway → Services

    Client
       ↓
    API Gateway
       ├── Auth Service
       └── Content Service

------------------------------------------------------------------------

## Services

### 1️⃣ API Gateway

Acts as the single entry point.

Responsibilities: - Route requests to services - Validate JWT tokens -
Apply guards/middleware - Centralized API surface

------------------------------------------------------------------------

### 2️⃣ Authentication Service

Handles identity and access control.

Features: - User registration - Login - Password hashing - JWT access
tokens - Refresh tokens - Emit domain events

Owns: - Users database table

------------------------------------------------------------------------

### 3️⃣ Content Service

Represents business/domain logic.

Example domain: - Posts - Tasks - Articles

Features: - Create content - List content - Ownership validation -
Authenticated access only

Owns: - Content database table

------------------------------------------------------------------------

## Tech Stack

-   NestJS (monorepo mode)
-   PostgreSQL
-   Prisma ORM
-   JWT Authentication
-   Docker Compose
-   Redis (optional for later caching)

------------------------------------------------------------------------

## Project Structure

    apps/
     ├── gateway/
     ├── auth-service/
     └── content-service/

    libs/
     ├── contracts/
     └── common/

------------------------------------------------------------------------

## Event Contracts (Minimal)

Even with two services, define shared contracts early.

    libs/contracts/events/

Example:

``` ts
export const USER_CREATED_EVENT = 'user.created';

export interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}
```

Why include this now? - Prevents tight coupling later - Makes future
services plug-and-play

------------------------------------------------------------------------

## MVP Features

### Authentication

-   Register user
-   Login user
-   Issue JWT token
-   Protected routes

### Content

-   Create content item
-   Fetch user content
-   Validate ownership

------------------------------------------------------------------------

## Database Schema (Minimal)

### Users

-   id (uuid)
-   email
-   password_hash
-   created_at

### Content

-   id (uuid)
-   title
-   body
-   owner_id
-   created_at

------------------------------------------------------------------------

## Communication Pattern

### Gateway → Services

Gateway forwards authenticated requests.

Example flow:

    Client Login
       ↓
    Gateway
       ↓
    Auth Service
       ↓
    JWT issued

    Create Content
       ↓
    Gateway validates JWT
       ↓
    Content Service

------------------------------------------------------------------------

## Development Order (Recommended)

1.  Create NestJS monorepo
2.  Setup shared `contracts` library
3.  Implement Auth Service
4.  Add JWT authentication
5.  Build API Gateway
6.  Connect Gateway → Auth Service
7.  Implement Content Service
8.  Protect content routes
9.  Add Docker Compose setup

------------------------------------------------------------------------

## Docker Services

-   gateway
-   auth-service
-   content-service
-   postgres

------------------------------------------------------------------------

## MVP Success Criteria

You are finished when:

-   User registers through Gateway
-   User logs in and receives JWT
-   Authenticated user creates content
-   Content is tied to correct user
-   All services run via Docker Compose

------------------------------------------------------------------------

## Future Extensions (Next Versions)

Add later without refactoring core:

-   Notification Service (event listener)
-   Job Worker Service (queues)
-   Redis caching
-   Analytics service
-   RBAC permissions
-   Multi-tenancy

------------------------------------------------------------------------

## What This MVP Demonstrates

-   Service separation
-   Authentication architecture
-   Clean NestJS modular design
-   Forward-compatible event contracts
-   Real backend system thinking

------------------------------------------------------------------------

**Goal:** Build a strong architectural foundation first. Expand safely
later.
