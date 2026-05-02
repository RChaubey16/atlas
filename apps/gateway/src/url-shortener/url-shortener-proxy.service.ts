import {
  GoneException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class UrlShortenerProxyService {
  private readonly logger = new Logger(UrlShortenerProxyService.name);
  private readonly urlShortenerUrl =
    process.env.URL_SHORTENER_URL ?? 'http://localhost:3003';

  constructor(private readonly http: HttpService) {}

  async createLink(body: unknown, userId: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(`${this.urlShortenerUrl}/links`, body, {
          headers: { 'x-user-id': userId },
        }),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, 'url-shortener/links');
    }
  }

  async getMyLinks(
    userId: string,
    page?: string,
    limit?: string,
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (limit) params.set('limit', limit);
    const query = params.size ? `?${params.toString()}` : '';

    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>(`${this.urlShortenerUrl}/links${query}`, {
          headers: { 'x-user-id': userId },
        }),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, 'url-shortener/links');
    }
  }

  async updateLink(
    slug: string,
    body: unknown,
    userId: string,
  ): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.patch<unknown>(
          `${this.urlShortenerUrl}/links/${slug}`,
          body,
          { headers: { 'x-user-id': userId } },
        ),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, `url-shortener/links/${slug}`);
    }
  }

  async getLinkAnalytics(slug: string, userId: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>(
          `${this.urlShortenerUrl}/links/${slug}/analytics`,
          { headers: { 'x-user-id': userId } },
        ),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, `url-shortener/links/${slug}/analytics`);
    }
  }

  async deleteLink(slug: string, userId: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.delete<unknown>(`${this.urlShortenerUrl}/links/${slug}`, {
          headers: { 'x-user-id': userId },
        }),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, `url-shortener/links/${slug}`);
    }
  }

  async resolveSlug(slug: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get(`${this.urlShortenerUrl}/s/${slug}`, {
        maxRedirects: 0,
        validateStatus: (s) => s === 302 || (s >= 400 && s < 600),
      }),
    );
    if (response.status === 302) return response.headers.location as string;
    if (response.status === 404) {
      this.logger.warn(
        `Upstream error [url-shortener/resolve] 404 slug=${slug}`,
      );
      throw new NotFoundException('Short link not found');
    }
    if (response.status === 410) {
      this.logger.warn(
        `Upstream error [url-shortener/resolve] 410 slug=${slug}`,
      );
      throw new GoneException('Link has expired');
    }
    this.logger.error(
      `Upstream error [url-shortener/resolve] ${response.status} slug=${slug}`,
    );
    throw new InternalServerErrorException();
  }

  private rethrowUpstreamError(err: unknown, upstream: string): never {
    if (err instanceof AxiosError && err.response) {
      const { status, data } = err.response as {
        status: number;
        data: Record<string, unknown>;
      };
      this.logger.warn(`Upstream error [${upstream}] ${status}`);
      const message =
        typeof data?.message === 'string' ? data.message : 'An error occurred';
      throw new HttpException(
        { ...data, displayErrorMessage: message },
        status,
      );
    }
    this.logger.error(`Unexpected error [${upstream}]`, err);
    throw err as Error;
  }
}
