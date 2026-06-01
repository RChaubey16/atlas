import { HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { EmailPlaygroundProxyService } from './email-playground-proxy.service';

const okResponse = (data: unknown): AxiosResponse => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as never,
});

describe('EmailPlaygroundProxyService', () => {
  let service: EmailPlaygroundProxyService;
  let http: { get: jest.Mock; post: jest.Mock; patch: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    http = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    // Set env var used by the service constructor
    process.env.NOTIFICATION_SERVICE_URL = 'http://localhost:3004';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailPlaygroundProxyService,
        { provide: HttpService, useValue: http },
      ],
    }).compile();

    service = module.get<EmailPlaygroundProxyService>(EmailPlaygroundProxyService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('POSTs to /email-templates with x-user-id header', async () => {
      const body = { name: 'T', blocks: [] };
      http.post.mockReturnValue(of(okResponse(body)));

      await service.create(body, 'user-1');

      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:3004/email-templates',
        body,
        { headers: { 'x-user-id': 'user-1' } },
      );
    });
  });

  describe('findAll', () => {
    it('GETs /email-templates with x-user-id header', async () => {
      http.get.mockReturnValue(of(okResponse([])));

      await service.findAll('user-1');

      expect(http.get).toHaveBeenCalledWith(
        'http://localhost:3004/email-templates',
        { headers: { 'x-user-id': 'user-1' } },
      );
    });
  });

  describe('findOne', () => {
    it('GETs /email-templates/:id with x-user-id header', async () => {
      http.get.mockReturnValue(of(okResponse({ id: 'tpl-1' })));

      await service.findOne('tpl-1', 'user-1');

      expect(http.get).toHaveBeenCalledWith(
        'http://localhost:3004/email-templates/tpl-1',
        { headers: { 'x-user-id': 'user-1' } },
      );
    });
  });

  describe('update', () => {
    it('PATCHes /email-templates/:id with x-user-id header and body', async () => {
      const body = { name: 'Updated' };
      http.patch.mockReturnValue(of(okResponse({ id: 'tpl-1', ...body })));

      await service.update('tpl-1', body, 'user-1');

      expect(http.patch).toHaveBeenCalledWith(
        'http://localhost:3004/email-templates/tpl-1',
        body,
        { headers: { 'x-user-id': 'user-1' } },
      );
    });
  });

  describe('remove', () => {
    it('DELETEs /email-templates/:id with x-user-id header', async () => {
      http.delete.mockReturnValue(of(okResponse(null)));

      await service.remove('tpl-1', 'user-1');

      expect(http.delete).toHaveBeenCalledWith(
        'http://localhost:3004/email-templates/tpl-1',
        { headers: { 'x-user-id': 'user-1' } },
      );
    });
  });

  describe('renderHtml', () => {
    it('POSTs to /email-templates/render without x-user-id', async () => {
      const body = { blocks: [], variables: {} };
      http.post.mockReturnValue(of(okResponse({ html: '<!DOCTYPE html>' })));

      const result = await service.renderHtml(body);

      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:3004/email-templates/render',
        body,
        { headers: {} },
      );
      expect(result).toEqual({ html: '<!DOCTYPE html>' });
    });
  });

  describe('sendTest', () => {
    it('POSTs to /email-templates/send-test with x-user-id', async () => {
      const body = { templateId: 'tpl-1', to: 'alice@example.com', variables: {} };
      http.post.mockReturnValue(of(okResponse({ sent: true })));

      await service.sendTest(body, 'user-1');

      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:3004/email-templates/send-test',
        body,
        { headers: { 'x-user-id': 'user-1' } },
      );
    });
  });

  describe('error handling', () => {
    it('converts upstream HTTP errors to HttpException', async () => {
      const err = new AxiosError('Forbidden');
      err.response = { status: 403, data: { message: 'Forbidden' } } as never;
      http.get.mockReturnValue(throwError(() => err));

      await expect(service.findAll('user-1')).rejects.toBeInstanceOf(HttpException);
    });

    it('re-throws non-Axios errors as-is', async () => {
      const err = new Error('Network error');
      http.get.mockReturnValue(throwError(() => err));

      await expect(service.findAll('user-1')).rejects.toThrow('Network error');
    });
  });
});
