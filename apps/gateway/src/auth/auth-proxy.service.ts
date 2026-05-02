import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { GoogleProfile } from './strategies/google.strategy';

@Injectable()
export class AuthProxyService {
  private readonly logger = new Logger(AuthProxyService.name);
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
      this.rethrowUpstreamError(err, 'auth-service/register');
    }
  }

  async login(body: unknown): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(`${this.authUrl}/auth/login`, body),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, 'auth-service/login');
    }
  }

  async refresh(body: unknown): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(`${this.authUrl}/auth/refresh`, body),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, 'auth-service/refresh');
    }
  }

  async googleProfile(profile: GoogleProfile): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(`${this.authUrl}/auth/google-profile`, profile),
      );
      return data;
    } catch (err) {
      this.rethrowUpstreamError(err, 'auth-service/google-profile');
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
