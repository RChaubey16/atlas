import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, GoneException } from '@nestjs/common';
import { RedirectController } from './redirect.controller';
import { LinksService } from '../links/links.service';

describe('RedirectController', () => {
  let controller: RedirectController;
  let service: jest.Mocked<LinksService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedirectController],
      providers: [
        {
          provide: LinksService,
          useValue: {
            resolveAndTrack: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RedirectController>(RedirectController);
    service = module.get(LinksService);
  });

  describe('redirect', () => {
    it('should return redirect object with targetUrl when link is valid', async () => {
      service.resolveAndTrack.mockResolvedValue('https://example.com');

      const result = await controller.redirect('abc123');

      expect(service.resolveAndTrack).toHaveBeenCalledWith('abc123');
      expect(result).toEqual({ url: 'https://example.com', statusCode: 302 });
    });

    it('should propagate NotFoundException when slug does not exist', async () => {
      service.resolveAndTrack.mockRejectedValue(new NotFoundException('Short link not found'));

      await expect(controller.redirect('missing')).rejects.toThrow(NotFoundException);
    });

    it('should propagate GoneException when link is expired', async () => {
      service.resolveAndTrack.mockRejectedValue(new GoneException('Link has expired'));

      await expect(controller.redirect('expired')).rejects.toThrow(GoneException);
    });
  });
});
