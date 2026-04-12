import { HttpException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AuthProxyService {
  private readonly authUrl =
    process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

  constructor(private readonly http: HttpService) {}

  async register(body: unknown): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(`${this.authUrl}/auth/register`, body),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err);
    }
  }

  async login(body: unknown): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(`${this.authUrl}/auth/login`, body),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err);
    }
  }

  async refresh(body: unknown): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(`${this.authUrl}/auth/refresh`, body),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err);
    }
  }

  private rethrowUpstreamError(err: unknown): never {
    if (err instanceof AxiosError && err.response) {
      const { status, data } = err.response as {
        status: number;
        data: Record<string, unknown>;
      };
      const message =
        typeof data?.message === 'string' ? data.message : 'An error occurred';
      throw new HttpException({ ...data, displayErrorMessage: message }, status);
    }
    throw err as Error;
  }
}
