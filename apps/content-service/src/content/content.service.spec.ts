import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from './content.service';

describe('ContentService', () => {
  let service: ContentService;

  const mockContent = {
    id: 'content-1',
    title: 'Hello World',
    body: 'Some body text.',
    ownerId: 'user-1',
    createdAt: new Date('2026-01-01'),
  };

  const mockPrisma = {
    content: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('saves a new content item and returns it', async () => {
      mockPrisma.content.create.mockResolvedValue(mockContent);

      const result = await service.create(
        { title: 'Hello World', body: 'Some body text.' },
        'user-1',
      );

      expect(mockPrisma.content.create).toHaveBeenCalledWith({
        data: { title: 'Hello World', body: 'Some body text.', ownerId: 'user-1' },
      });
      expect(result).toEqual(mockContent);
    });
  });

  describe('findAllByOwner', () => {
    it('returns all content for the given owner ordered newest first', async () => {
      mockPrisma.content.findMany.mockResolvedValue([mockContent]);

      const result = await service.findAllByOwner('user-1');

      expect(mockPrisma.content.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockContent]);
    });

    it('returns an empty array when the user has no content', async () => {
      mockPrisma.content.findMany.mockResolvedValue([]);
      const result = await service.findAllByOwner('user-99');
      expect(result).toEqual([]);
    });
  });

  describe('findOneByOwner', () => {
    it('returns the item when it exists and belongs to the user', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockContent);
      const result = await service.findOneByOwner('content-1', 'user-1');
      expect(result).toEqual(mockContent);
    });

    it('throws NotFoundException when the item does not exist', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(null);
      await expect(service.findOneByOwner('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the item belongs to a different user', async () => {
      mockPrisma.content.findUnique.mockResolvedValue(mockContent);
      await expect(
        service.findOneByOwner('content-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
