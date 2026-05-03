import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class UserTemplatesProxyService {
  private readonly logger = new Logger(UserTemplatesProxyService.name);
  private readonly notificationUrl: string;
  private readonly internalKey: string;

  constructor(
    private readonly http: HttpService,
    configService: ConfigService,
  ) {
    this.notificationUrl = configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
      'http://localhost:3004',
    );
    this.internalKey = configService.getOrThrow<string>(
      'INTERNAL_NOTIFICATION_KEY',
    );
  }

  async create(userId: string, body: unknown): Promise<unknown> {
    return this.forward('post', '/user-templates', userId, body);
  }

  async findAll(userId: string): Promise<unknown> {
    return this.forward('get', '/user-templates', userId);
  }

  async findOne(id: string, userId: string): Promise<unknown> {
    return this.forward('get', `/user-templates/${id}`, userId);
  }

  async delete(id: string, userId: string): Promise<unknown> {
    return this.forward('delete', `/user-templates/${id}`, userId);
  }

  private async forward(
    method: 'get' | 'post' | 'delete',
    path: string,
    userId: string,
    body?: unknown,
  ): Promise<unknown> {
    const headers = {
      'x-internal-key': this.internalKey,
      'x-user-id': userId,
    };
    try {
      const { data } = await firstValueFrom(
        method === 'post'
          ? this.http.post<unknown>(`${this.notificationUrl}${path}`, body, {
              headers,
            })
          : method === 'delete'
            ? this.http.delete<unknown>(`${this.notificationUrl}${path}`, {
                headers,
              })
            : this.http.get<unknown>(`${this.notificationUrl}${path}`, {
                headers,
              }),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, `notification${path}`);
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
