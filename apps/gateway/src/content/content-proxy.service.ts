import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class ContentProxyService {
  private readonly logger = new Logger(ContentProxyService.name);
  private readonly contentUrl =
    process.env.CONTENT_SERVICE_URL ?? 'http://localhost:3002';

  constructor(private readonly http: HttpService) {}

  async createContent(body: unknown, userId: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(`${this.contentUrl}/content`, body, {
          headers: { 'x-user-id': userId },
        }),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, 'content-service/create');
    }
  }

  async getMyContent(userId: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>(`${this.contentUrl}/content`, {
          headers: { 'x-user-id': userId },
        }),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, 'content-service/list');
    }
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
