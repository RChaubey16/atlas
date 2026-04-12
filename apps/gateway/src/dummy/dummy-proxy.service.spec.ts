import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';

import { DummyProxyService } from './dummy-proxy.service';

describe('DummyProxyService', () => {
  let service: DummyProxyService;
  let httpService: HttpService;

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
      providers: [
        DummyProxyService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DummyProxyService>(DummyProxyService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('getBlogs', () => {
    it('should proxy GET /dummy/blogs to content service and return data', async () => {
      const response: AxiosResponse = {
        data: mockBlogs,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as AxiosResponse['config'],
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const result = await service.getBlogs();

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/dummy/blogs'),
      );
      expect(result).toEqual(mockBlogs);
    });
  });

  describe('getUsers', () => {
    it('should proxy GET /dummy/users to content service and return data', async () => {
      const response: AxiosResponse = {
        data: mockUsers,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as AxiosResponse['config'],
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const result = await service.getUsers();

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/dummy/users'),
      );
      expect(result).toEqual(mockUsers);
    });
  });
});
