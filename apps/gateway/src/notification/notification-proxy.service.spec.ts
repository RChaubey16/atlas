import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { NotificationProxyService } from './notification-proxy.service';

const okResponse = (data: unknown): AxiosResponse => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as never,
});

describe('NotificationProxyService', () => {
  let service: NotificationProxyService;
  let http: jest.Mocked<HttpService>;

  const mockConfig = {
    get: jest.fn().mockReturnValue('http://localhost:3004'),
    getOrThrow: jest.fn().mockReturnValue('internal-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProxyService,
        {
          provide: HttpService,
          useValue: { post: jest.fn() },
        },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<NotificationProxyService>(NotificationProxyService);
    http = module.get(HttpService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('sendEmail', () => {
    const command = {
      templateId: 'welcome',
      to: ['alice@example.com'],
      templateData: { email: 'alice@example.com' },
    };

    it('POSTs to /notify/send with x-internal-key header and returns data', async () => {
      (http.post as jest.Mock).mockReturnValue(of(okResponse({ sent: 1 })));

      const result = await service.sendEmail(command);

      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:3004/notify/send',
        command,
        expect.objectContaining({
          headers: { 'x-internal-key': 'internal-secret' },
        }),
      );
      expect(result).toEqual({ sent: 1 });
    });

    it('re-throws upstream HTTP errors as HttpException with the upstream status', async () => {
      const axiosError = new AxiosError('Upstream failed');
      axiosError.response = {
        status: 404,
        data: { message: 'Template not found' },
      } as never;
      (http.post as jest.Mock).mockReturnValue(throwError(() => axiosError));

      await expect(service.sendEmail(command)).rejects.toBeInstanceOf(
        HttpException,
      );
    });

    it('re-throws unexpected errors as-is', async () => {
      const err = new Error('Network error');
      (http.post as jest.Mock).mockReturnValue(throwError(() => err));

      await expect(service.sendEmail(command)).rejects.toThrow('Network error');
    });
  });
});
