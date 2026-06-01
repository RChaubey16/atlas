import { USER_CREATED_EVENT } from '@app/contracts';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  };

  const mockNotificationClient = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };
      if (!config[key]) throw new Error(`Missing required config: ${key}`);
      return config[key];
    }),
  };

  const createdUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date('2026-04-08'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: 'NOTIFICATION_SERVICE', useValue: mockNotificationClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = { email: 'test@example.com', password: 'password123' };

    it('should return accessToken and refreshToken on success', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.register(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should emit user.created event with correct payload after registration', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      await service.register(dto);

      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        USER_CREATED_EVENT,
        expect.objectContaining({
          userId: 'user-id-123',
          email: 'test@example.com',
        }),
      );
    });

    it('should throw ConflictException and not emit event if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(createdUser);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockNotificationClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for unknown email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for a Google-only account (no passwordHash)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...createdUser,
        passwordHash: null,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'anything' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for a wrong password', async () => {
      // bcrypt.compare will return false for a plaintext password vs a real hash
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...createdUser,
        // real bcrypt hash of 'correct-password'
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens for valid credentials', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correct-password', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...createdUser,
        passwordHash: hash,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refresh', () => {
    it('should return a new token pair for a valid refresh token', () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-id-123',
        email: 'test@example.com',
      });

      const result = service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for an invalid refresh token', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => service.refresh('bad-token')).toThrow(UnauthorizedException);
    });
  });

  describe('findOrCreateGoogleUser', () => {
    const googleDto = {
      googleId: 'google-123',
      email: 'google@example.com',
      name: 'Google User',
    };

    it('returns tokens for an existing user found by googleId', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(createdUser); // found by googleId

      const result = await service.findOrCreateGoogleUser(googleDto);

      expect(result).toHaveProperty('accessToken');
      expect(mockNotificationClient.emit).not.toHaveBeenCalled();
    });

    it('links googleId to existing email/password account and returns tokens', async () => {
      const existingUser = { ...createdUser, googleId: null };
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)           // not found by googleId
        .mockResolvedValueOnce(existingUser);  // found by email

      mockPrismaService.user.update.mockResolvedValue({
        ...existingUser,
        googleId: 'google-123',
      });

      const result = await service.findOrCreateGoogleUser(googleDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { googleId: 'google-123' },
        }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(mockNotificationClient.emit).not.toHaveBeenCalled();
    });

    it('creates a new user and emits user.created when no match is found', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'google@example.com',
        passwordHash: null,
        googleId: 'google-123',
        createdAt: new Date(),
      };
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null) // not found by googleId
        .mockResolvedValueOnce(null); // not found by email

      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.findOrCreateGoogleUser(googleDto);

      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        USER_CREATED_EVENT,
        expect.objectContaining({ userId: 'new-user-id' }),
      );
      expect(result).toHaveProperty('accessToken');
    });
  });
});
