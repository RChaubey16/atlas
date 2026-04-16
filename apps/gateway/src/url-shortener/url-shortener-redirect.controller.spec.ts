import { Test, TestingModule } from '@nestjs/testing';
import { UrlShortenerRedirectController } from './url-shortener-redirect.controller';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';

describe('UrlShortenerRedirectController', () => {
  let controller: UrlShortenerRedirectController;
  let service: jest.Mocked<UrlShortenerProxyService>;

  const mockRes = {
    redirect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlShortenerRedirectController],
      providers: [
        {
          provide: UrlShortenerProxyService,
          useValue: {
            resolveSlug: jest.fn().mockResolvedValue('https://example.com'),
          },
        },
      ],
    }).compile();

    controller = module.get<UrlShortenerRedirectController>(UrlShortenerRedirectController);
    service = module.get(UrlShortenerProxyService);
    jest.clearAllMocks();
  });

  describe('redirect', () => {
    it('should call resolveSlug and redirect to the target URL', async () => {
      await controller.redirect('abc123', mockRes as any);

      expect(service.resolveSlug).toHaveBeenCalledWith('abc123');
      expect(mockRes.redirect).toHaveBeenCalledWith(302, 'https://example.com');
    });
  });
});
