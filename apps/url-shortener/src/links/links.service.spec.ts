import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LinksService } from './links.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LinksService', () => {
  let service: LinksService;
  let prisma: jest.Mocked<PrismaService>;

  const mockLink = {
    id: 'link-1',
    slug: 'abc123',
    targetUrl: 'https://example.com',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    _count: { clicks: 5 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        {
          provide: PrismaService,
          useValue: {
            shortLink: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
            },
            clickEvent: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a link with an auto-generated slug when none provided', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.shortLink.create as jest.Mock).mockResolvedValue(mockLink);

      const result = await service.create({ targetUrl: 'https://example.com' }, 'user-1');

      expect(prisma.shortLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            targetUrl: 'https://example.com',
            userId: 'user-1',
          }),
        }),
      );
      expect(result).toMatchObject({
        targetUrl: 'https://example.com',
        clickCount: 5,
      });
    });

    it('should create a link with a custom slug when provided', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.shortLink.create as jest.Mock).mockResolvedValue(mockLink);

      await service.create({ targetUrl: 'https://example.com', slug: 'my-brand' }, 'user-1');

      expect(prisma.shortLink.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'my-brand' }),
        }),
      );
    });

    it('should throw ConflictException when custom slug is already taken', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(mockLink);

      await expect(
        service.create({ targetUrl: 'https://example.com', slug: 'taken' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllByUser', () => {
    it('should return all links for the given userId with clickCount', async () => {
      (prisma.shortLink.findMany as jest.Mock).mockResolvedValue([mockLink]);

      const result = await service.findAllByUser('user-1');

      expect(prisma.shortLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ slug: 'abc123', clickCount: 5 });
    });

    it('should not return links belonging to other users', async () => {
      (prisma.shortLink.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllByUser('other-user');
      expect(result).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete the link when user owns it', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(mockLink);

      await service.delete('abc123', 'user-1');

      expect(prisma.shortLink.delete).toHaveBeenCalledWith({ where: { slug: 'abc123' } });
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own the link', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(mockLink);

      await expect(service.delete('abc123', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resolveAndTrack', () => {
    it('should insert a click event and return targetUrl for a valid link', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(mockLink);
      (prisma.clickEvent.create as jest.Mock).mockResolvedValue({});

      const result = await service.resolveAndTrack('abc123');

      expect(prisma.clickEvent.create).toHaveBeenCalledWith({
        data: { shortLinkId: 'link-1' },
      });
      expect(result).toBe('https://example.com');
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resolveAndTrack('missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw GoneException when link is expired', async () => {
      const expiredLink = { ...mockLink, expiresAt: new Date(Date.now() - 1000) };
      (prisma.shortLink.findUnique as jest.Mock).mockResolvedValue(expiredLink);

      await expect(service.resolveAndTrack('abc123')).rejects.toThrow(
        expect.objectContaining({ status: 410 }),
      );
    });
  });
});
