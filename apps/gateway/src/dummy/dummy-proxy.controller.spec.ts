import { Test, TestingModule } from '@nestjs/testing';

import { DummyProxyController } from './dummy-proxy.controller';
import { DummyProxyService } from './dummy-proxy.service';

describe('DummyProxyController', () => {
  let controller: DummyProxyController;
  let service: DummyProxyService;

  const mockBlogs = [
    {
      id: '1',
      title: 'Test Blog',
      body: 'Body',
      author: 'Author',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  const mockUsers = [
    {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DummyProxyController],
      providers: [
        {
          provide: DummyProxyService,
          useValue: {
            getBlogs: jest.fn().mockResolvedValue(mockBlogs),
            getUsers: jest.fn().mockResolvedValue(mockUsers),
          },
        },
      ],
    }).compile();

    controller = module.get<DummyProxyController>(DummyProxyController);
    service = module.get<DummyProxyService>(DummyProxyService);
  });

  describe('getBlogs', () => {
    it('should call DummyProxyService.getBlogs and return result', async () => {
      const result = await controller.getBlogs();
      expect(service.getBlogs).toHaveBeenCalled();
      expect(result).toEqual(mockBlogs);
    });
  });

  describe('getUsers', () => {
    it('should call DummyProxyService.getUsers and return result', async () => {
      const result = await controller.getUsers();
      expect(service.getUsers).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });
});
