import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthProxyService {
  private readonly authUrl =
    process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';

  constructor(private readonly http: HttpService) {}

  async register(body: unknown): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.post<unknown>(`${this.authUrl}/auth/register`, body),
    );
    return data;
  }

  async login(body: unknown): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.post<unknown>(`${this.authUrl}/auth/login`, body),
    );
    return data;
  }

  async refresh(body: unknown): Promise<unknown> {
    const { data } = await firstValueFrom(
      this.http.post<unknown>(`${this.authUrl}/auth/refresh`, body),
    );
    return data;
  }
}
