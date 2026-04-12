import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ContentProxyService {
  private readonly contentUrl =
    process.env.CONTENT_SERVICE_URL ?? 'http://localhost:3002';

  constructor(private readonly http: HttpService) {}

  async createContent(body: unknown, userId: string): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.post<unknown>(`${this.contentUrl}/content`, body, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }

  async getMyContent(userId: string): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.get<unknown>(`${this.contentUrl}/content`, {
        headers: { 'x-user-id': userId },
      }),
    );
    return data;
  }
}
