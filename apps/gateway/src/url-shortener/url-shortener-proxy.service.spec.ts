import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { NotFoundException, GoneException } from '@nestjs/common';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('UrlShortenerProxyService', () => {
  let service: UrlShortenerProxyService;
  let httpService: HttpService;

  const mockLink = {
    slug: 'abc123',
    targetUrl: 'https://example.com',
    expiresAt: '2026-05-08T00:00:00.000Z',
    createdAt: '2026-04-08T00:00:00.000Z',
    clickCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlShortenerProxyService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UrlShortenerProxyService>(UrlShortenerProxyService);
    httpService = module.get<HttpService>(HttpService);
  });

  const okResponse = (data: unknown): AxiosResponse =>
    ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as any });

  describe('createLink', () => {
    it('should POST to /links with x-user-id header and return data', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of(okResponse(mockLink)));

      const result = await service.createLink({ targetUrl: 'https://example.com' }, 'user-1');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/links'),
        { targetUrl: 'https://example.com' },
        expect.objectContaining({ headers: { 'x-user-id': 'user-1' } }),
      );
      expect(result).toEqual(mockLink);
    });
  });

  describe('getMyLinks', () => {
    it('should GET /links with x-user-id header and return data', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(of(okResponse([mockLink])));

      const result = await service.getMyLinks('user-1');

      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/links'),
        expect.objectContaining({ headers: { 'x-user-id': 'user-1' } }),
      );
      expect(result).toEqual([mockLink]);
    });
  });

  describe('deleteLink', () => {
    it('should DELETE /links/:slug with x-user-id header and return data', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(of(okResponse(null)));

      await service.deleteLink('abc123', 'user-1');

      expect(httpService.delete).toHaveBeenCalledWith(
        expect.stringContaining('/links/abc123'),
        expect.objectContaining({ headers: { 'x-user-id': 'user-1' } }),
      );
    });
  });

  describe('resolveSlug', () => {
    it('should GET /s/:slug and return the Location header on 302', async () => {
      const redirectResponse: AxiosResponse = {
        data: null,
        status: 302,
        statusText: 'Found',
        headers: { location: 'https://example.com' },
        config: {} as any,
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(redirectResponse));

      const result = await service.resolveSlug('abc123');

      expect(result).toBe('https://example.com');
    });

    it('should throw NotFoundException when url-shortener returns 404', async () => {
      const notFoundResponse: AxiosResponse = {
        data: null,
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(notFoundResponse));

      await expect(service.resolveSlug('missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw GoneException when url-shortener returns 410', async () => {
      const goneResponse: AxiosResponse = {
        data: null,
        status: 410,
        statusText: 'Gone',
        headers: {},
        config: {} as any,
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(goneResponse));

      await expect(service.resolveSlug('expired')).rejects.toThrow(GoneException);
    });
  });
});
