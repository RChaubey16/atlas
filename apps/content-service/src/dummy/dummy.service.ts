import { Injectable } from '@nestjs/common';

export interface Blog {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
}

export interface FakeUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

@Injectable()
export class DummyService {
  getBlogs(): Blog[] {
    return [
      {
        id: '1',
        title: 'Getting Started with NestJS',
        body: 'NestJS is a progressive Node.js framework built with TypeScript. It provides an out-of-the-box application architecture that allows developers to create highly testable, scalable, and maintainable applications.',
        author: 'Jane Doe',
        createdAt: '2026-01-15T10:00:00.000Z',
      },
      {
        id: '2',
        title: 'Understanding Microservices',
        body: 'Microservices architecture breaks an application into small, independently deployable services. Each service is responsible for a specific business capability and communicates over well-defined APIs.',
        author: 'John Smith',
        createdAt: '2026-01-20T12:00:00.000Z',
      },
      {
        id: '3',
        title: 'JWT Authentication Deep Dive',
        body: 'JSON Web Tokens are a compact, URL-safe means of representing claims between two parties. They are commonly used for authentication and information exchange in web applications.',
        author: 'Alice Johnson',
        createdAt: '2026-02-01T09:00:00.000Z',
      },
      {
        id: '4',
        title: 'PostgreSQL Performance Tips',
        body: 'Proper indexing, query planning, and connection pooling are key to high-performance PostgreSQL. Understanding EXPLAIN ANALYZE output helps identify and fix slow queries.',
        author: 'Bob Williams',
        createdAt: '2026-02-10T14:00:00.000Z',
      },
      {
        id: '5',
        title: 'Docker Compose for Local Development',
        body: 'Docker Compose lets you define multi-container applications in a single YAML file. It is ideal for local development environments where you need databases, caches, and multiple services running together.',
        author: 'Carol Davis',
        createdAt: '2026-03-05T11:00:00.000Z',
      },
    ];
  }

  getUsers(): FakeUser[] {
    return [
      {
        id: '1',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
      },
      {
        id: '2',
        name: 'John Smith',
        email: 'john.smith@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=2',
      },
      {
        id: '3',
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=3',
      },
      {
        id: '4',
        name: 'Bob Williams',
        email: 'bob.williams@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=4',
      },
      {
        id: '5',
        name: 'Carol Davis',
        email: 'carol.davis@example.com',
        avatarUrl: 'https://i.pravatar.cc/150?img=5',
      },
    ];
  }
}
