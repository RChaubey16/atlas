import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { UserTemplatesProxyService } from './user-templates-proxy.service';

const okResponse = (data: unknown): AxiosResponse => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as never,
});

const expectedHeaders = {
  'x-internal-key': 'internal-secret',
  'x-user-id': 'user-1',
};

describe('UserTemplatesProxyService', () => {
  let service: UserTemplatesProxyService;
  let http: { get: jest.Mock; post: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    http = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTemplatesProxyService,
        { provide: HttpService, useValue: http },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3004'),
            getOrThrow: jest.fn().mockReturnValue('internal-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<UserTemplatesProxyService>(UserTemplatesProxyService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('POSTs to /user-templates with both security headers', async () => {
      const body = { name: 'T', subject: 'S', html: '<p>H</p>' };
      http.post.mockReturnValue(of(okResponse(body)));

      await service.create('user-1', body);

      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:3004/user-templates',
        body,
        { headers: expectedHeaders },
      );
    });
  });

  describe('findAll', () => {
    it('GETs /user-templates with both security headers', async () => {
      http.get.mockReturnValue(of(okResponse([])));

      await service.findAll('user-1');

      expect(http.get).toHaveBeenCalledWith(
        'http://localhost:3004/user-templates',
        { headers: expectedHeaders },
      );
    });
  });

  describe('findOne', () => {
    it('GETs /user-templates/:id with both security headers', async () => {
      http.get.mockReturnValue(of(okResponse({ id: 'tpl-1' })));

      await service.findOne('tpl-1', 'user-1');

      expect(http.get).toHaveBeenCalledWith(
        'http://localhost:3004/user-templates/tpl-1',
        { headers: expectedHeaders },
      );
    });
  });

  describe('delete', () => {
    it('DELETEs /user-templates/:id with both security headers', async () => {
      http.delete.mockReturnValue(of(okResponse(null)));

      await service.delete('tpl-1', 'user-1');

      expect(http.delete).toHaveBeenCalledWith(
        'http://localhost:3004/user-templates/tpl-1',
        { headers: expectedHeaders },
      );
    });
  });

  describe('error handling', () => {
    it('converts upstream HTTP errors to HttpException', async () => {
      const err = new AxiosError('Not found');
      err.response = { status: 404, data: { message: 'Not found' } } as never;
      http.get.mockReturnValue(throwError(() => err));

      await expect(service.findAll('user-1')).rejects.toBeInstanceOf(HttpException);
    });
  });
});
