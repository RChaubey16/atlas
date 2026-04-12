import { USER_CREATED_EVENT } from '@app/contracts';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
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
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockNotificationClient = {
    emit: jest.fn(),
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
  });
});
