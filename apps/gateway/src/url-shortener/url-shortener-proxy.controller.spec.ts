import { Test, TestingModule } from '@nestjs/testing';
import { UrlShortenerProxyController } from './url-shortener-proxy.controller';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';

describe('UrlShortenerProxyController', () => {
  let controller: UrlShortenerProxyController;
  let service: jest.Mocked<UrlShortenerProxyService>;

  const mockLink = {
    slug: 'abc123',
    targetUrl: 'https://example.com',
    expiresAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-04-08T00:00:00.000Z',
    clickCount: 0,
  };

  const mockReq = { user: { userId: 'user-1', email: 'test@example.com' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlShortenerProxyController],
      providers: [
        {
          provide: UrlShortenerProxyService,
          useValue: {
            createLink: jest.fn().mockResolvedValue(mockLink),
            getMyLinks: jest.fn().mockResolvedValue([mockLink]),
            deleteLink: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<UrlShortenerProxyController>(UrlShortenerProxyController);
    service = module.get(UrlShortenerProxyService);
  });

  describe('create', () => {
    it('should call createLink with body and userId from request', async () => {
      const body = { targetUrl: 'https://example.com' };
      const result = await controller.create(body, mockReq as any);

      expect(service.createLink).toHaveBeenCalledWith(body, 'user-1');
      expect(result).toEqual(mockLink);
    });
  });

  describe('getMyLinks', () => {
    it('should call getMyLinks with userId from request', async () => {
      const result = await controller.getMyLinks(mockReq as any);

      expect(service.getMyLinks).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([mockLink]);
    });
  });

  describe('deleteLink', () => {
    it('should call deleteLink with slug and userId from request', async () => {
      await controller.deleteLink('abc123', mockReq as any);

      expect(service.deleteLink).toHaveBeenCalledWith('abc123', 'user-1');
    });
  });
});
