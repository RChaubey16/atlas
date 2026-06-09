import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';

import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth HTTP (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificationClient = {
    emit: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
  };

  const mockConfigService = {
    getOrThrow: (key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };
      if (!config[key]) throw new Error(`Missing required config: ${key}`);
      return config[key];
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'NOTIFICATION_SERVICE', useValue: mockNotificationClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /auth/register', () => {
    it('returns 201 with token pair on valid registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-id-1',
        email: 'test@example.com',
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('emits user.created event after successful registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-id-1',
        email: 'test@example.com',
        createdAt: new Date(),
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(mockNotificationClient.emit).toHaveBeenCalledTimes(1);
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({ userId: 'user-id-1', email: 'test@example.com' }),
      );
    });

    it('returns 409 when email is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing',
        email: 'test@example.com',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(mockNotificationClient.emit).not.toHaveBeenCalled();
    });

    it('returns 400 for missing password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 with token pair for valid credentials', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-1',
        email: 'test@example.com',
        passwordHash: hash,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'correct-password' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('returns 401 for wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-1',
        email: 'test@example.com',
        passwordHash: hash,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'unknown@example.com', password: 'anything' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for a Google-only account (no passwordHash)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-1',
        email: 'google@example.com',
        passwordHash: null,
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'google@example.com', password: 'anything' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 200 with a new token pair for a valid refresh token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-id-1',
        email: 'test@example.com',
        createdAt: new Date(),
      });

      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      const { refreshToken } = registerRes.body as { refreshToken: string };

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('returns 401 for an invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'this-is-not-a-valid-jwt' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for an expired refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalid',
        });

      expect(res.status).toBe(401);
    });
  });
});
