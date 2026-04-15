import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContentProxyController } from './content-proxy.controller';
import { ContentProxyService } from './content-proxy.service';
import { CreateContentDto } from './dto/create-content.dto';

describe('ContentProxyController', () => {
  let controller: ContentProxyController;
  let service: ContentProxyService;

  const mockContent = {
    id: 'clxyz123abc',
    title: 'Test',
    body: 'Body',
    ownerId: 'user1',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const mockRequest = {
    user: { userId: 'user1', email: 'user@example.com' },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentProxyController],
      providers: [
        {
          provide: ContentProxyService,
          useValue: {
            createContent: jest.fn().mockResolvedValue(mockContent),
            getMyContent: jest.fn().mockResolvedValue([mockContent]),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContentProxyController>(ContentProxyController);
    service = module.get<ContentProxyService>(ContentProxyService);
  });

  describe('create', () => {
    it('should call contentProxy.createContent with dto and userId, and return the result', async () => {
      const dto: CreateContentDto = { title: 'Test', body: 'Body' };
      const result = await controller.create(dto, mockRequest);
      expect(service.createContent).toHaveBeenCalledWith(dto, 'user1');
      expect(result).toEqual(mockContent);
    });
  });

  describe('getMyContent', () => {
    it('should call contentProxy.getMyContent with the userId and return the result', async () => {
      const result = await controller.getMyContent(mockRequest);
      expect(service.getMyContent).toHaveBeenCalledWith('user1');
      expect(result).toEqual([mockContent]);
    });
  });
});
