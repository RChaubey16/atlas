import {
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UrlShortenerProxyService {
  private readonly logger = new Logger(UrlShortenerProxyService.name);
  private readonly urlShortenerUrl =
    process.env.URL_SHORTENER_URL ?? 'http://localhost:3003';

  constructor(private readonly http: HttpService) {}

  async createLink(body: unknown, userId: string): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.post<unknown>(`${this.urlShortenerUrl}/links`, body, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }

  async getMyLinks(userId: string): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.get<unknown>(`${this.urlShortenerUrl}/links`, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }

  async deleteLink(slug: string, userId: string): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.delete<unknown>(`${this.urlShortenerUrl}/links/${slug}`, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
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
      this.logger.warn(`Upstream error [url-shortener/resolve] 404 slug=${slug}`);
      throw new NotFoundException('Short link not found');
    }
    if (response.status === 410) {
      this.logger.warn(`Upstream error [url-shortener/resolve] 410 slug=${slug}`);
      throw new GoneException('Link has expired');
    }
    this.logger.error(
      `Upstream error [url-shortener/resolve] ${response.status} slug=${slug}`,
    );
    throw new InternalServerErrorException();
  }
}
