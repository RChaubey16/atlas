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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinksController],
      providers: [
        {
          provide: LinksService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockLink),
            findAllByUser: jest.fn().mockResolvedValue([mockLink]),
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
      await expect(controller.create({ targetUrl: 'https://example.com' } as any, '')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findAll', () => {
    it('should call LinksService.findAllByUser with userId from header', async () => {
      const result = await controller.findAll('user-1');

      expect(service.findAllByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([mockLink]);
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(controller.findAll('')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('delete', () => {
    it('should call LinksService.delete with slug and userId from header', async () => {
      await controller.delete('abc123', 'user-1');

      expect(service.delete).toHaveBeenCalledWith('abc123', 'user-1');
    });

    it('should throw UnauthorizedException when x-user-id header is missing', async () => {
      await expect(controller.delete('abc123', '')).rejects.toThrow(UnauthorizedException);
    });
  });
});
