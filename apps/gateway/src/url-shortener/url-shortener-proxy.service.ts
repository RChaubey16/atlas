import {
  Injectable,
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UrlShortenerProxyService {
  private readonly urlShortenerUrl =
    process.env.URL_SHORTENER_URL ?? 'http://localhost:3003';

  constructor(private readonly http: HttpService) {}

  async createLink(body: unknown, userId: string) {
    const { data } = await firstValueFrom(
      this.http.post(`${this.urlShortenerUrl}/links`, body, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }

  async getMyLinks(userId: string) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.urlShortenerUrl}/links`, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }

  async deleteLink(slug: string, userId: string) {
    const { data } = await firstValueFrom(
      this.http.delete(`${this.urlShortenerUrl}/links/${slug}`, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }

  async resolveSlug(slug: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get(`${this.urlShortenerUrl}/s/${slug}`, {
        maxRedirects: 0,
        validateStatus: s => s === 302 || (s >= 400 && s < 600),
      }),
    );
    if (response.status === 302) return response.headers.location as string;
    if (response.status === 404) throw new NotFoundException('Short link not found');
    if (response.status === 410) throw new GoneException('Link has expired');
    throw new InternalServerErrorException();
  }
}
