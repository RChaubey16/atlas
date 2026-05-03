import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class EmailPlaygroundProxyService {
  private readonly logger = new Logger(EmailPlaygroundProxyService.name);
  private readonly baseUrl =
    process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004';

  constructor(private readonly http: HttpService) {}

  async create(body: unknown, userId: string): Promise<unknown> {
    return this.proxy('post', '/email-templates', userId, body);
  }

  async findAll(userId: string): Promise<unknown> {
    return this.proxy('get', '/email-templates', userId);
  }

  async findOne(id: string, userId: string): Promise<unknown> {
    return this.proxy('get', `/email-templates/${id}`, userId);
  }

  async update(id: string, body: unknown, userId: string): Promise<unknown> {
    return this.proxy('patch', `/email-templates/${id}`, userId, body);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.proxy('delete', `/email-templates/${id}`, userId);
  }

  async renderHtml(body: unknown): Promise<unknown> {
    return this.proxy('post', '/email-templates/render', undefined, body);
  }

  async sendTest(body: unknown, userId: string): Promise<unknown> {
    return this.proxy('post', '/email-templates/send-test', userId, body);
  }

  private async proxy(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    userId?: string,
    body?: unknown,
  ): Promise<unknown> {
    const headers: Record<string, string> = {};
    if (userId) headers['x-user-id'] = userId;

    try {
      const url = `${this.baseUrl}${path}`;
      let obs;
      if (method === 'get') {
        obs = this.http.get<unknown>(url, { headers });
      } else if (method === 'delete') {
        obs = this.http.delete<unknown>(url, { headers });
      } else if (method === 'patch') {
        obs = this.http.patch<unknown>(url, body, { headers });
      } else {
        obs = this.http.post<unknown>(url, body, { headers });
      }
      const result = await firstValueFrom(obs);
      return (result as { data: unknown }).data;
    } catch (err) {
      this.rethrowUpstreamError(err, `email-playground/${method} ${path}`);
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
      throw new HttpException({ ...data, displayErrorMessage: message }, status);
    }
    this.logger.error(`Unexpected error [${upstream}]`, err);
    throw err as Error;
  }
}
