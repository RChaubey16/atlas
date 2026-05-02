import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

describe('LinksController', () => {
  let controller: LinksController;
  let service: jest.Mocked<LinksService>;

  const mockLink = {
    slug: 'abc123',
    targetUrl: 'https://example.com',
    expiresAt: new Date(),
    createdAt: new Date(),
    clickCount: 0,
  };

  const mockPaginated = { data: [mockLink], total: 1, page: 1, pages: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinksController],
      providers: [
        {
          provide: LinksService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockLink),
            findAllByUser: jest.fn().mockResolvedValue(mockPaginated),
            update: jest.fn().mockResolvedValue(mockLink),
            getAnalytics: jest.fn().mockResolvedValue({
              totalClicks: 0,
              clicksByDay: [],
              lastClickedAt: null,
            }),
            delete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<LinksController>(LinksController);
    service = module.get(LinksService);
  });

  describe('create', () => {
    it('should call LinksService.create with dto and userId from header', async () => {
      const dto = { targetUrl: 'https://example.com' };
      const result = await controller.create(dto as any, 'user-1');

      expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(mockLink);
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(
        controller.create({ targetUrl: 'https://example.com' } as any, ''),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findAll', () => {
    it('should call LinksService.findAllByUser with default pagination', async () => {
      const result = await controller.findAll('user-1');

      expect(service.findAllByUser).toHaveBeenCalledWith('user-1', 1, 20);
      expect(result).toEqual(mockPaginated);
    });

    it('should forward page and limit query params', async () => {
      await controller.findAll('user-1', '2', '10');

      expect(service.findAllByUser).toHaveBeenCalledWith('user-1', 2, 10);
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(controller.findAll('')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('update', () => {
    it('should call LinksService.update with slug, dto, and userId', async () => {
      const dto = { targetUrl: 'https://new-url.com' };
      const result = await controller.update('abc123', dto as any, 'user-1');

      expect(service.update).toHaveBeenCalledWith('abc123', dto, 'user-1');
      expect(result).toEqual(mockLink);
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(controller.update('abc123', {} as any, '')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getAnalytics', () => {
    it('should call LinksService.getAnalytics with slug and userId', async () => {
      await controller.getAnalytics('abc123', 'user-1');

      expect(service.getAnalytics).toHaveBeenCalledWith('abc123', 'user-1');
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(controller.getAnalytics('abc123', '')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('delete', () => {
    it('should call LinksService.delete with slug and userId from header', async () => {
      await controller.delete('abc123', 'user-1');

      expect(service.delete).toHaveBeenCalledWith('abc123', 'user-1');
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(controller.delete('abc123', '')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
