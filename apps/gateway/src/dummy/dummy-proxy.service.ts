import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DummyProxyService {
  private readonly contentUrl =
    process.env.CONTENT_SERVICE_URL ?? 'http://localhost:3002';

  constructor(private readonly http: HttpService) {}

  async getBlogs() {
    const { data } = await firstValueFrom(
      this.http.get(`${this.contentUrl}/dummy/blogs`),
    );
    return data;
  }

  async getUsers() {
    const { data } = await firstValueFrom(
      this.http.get(`${this.contentUrl}/dummy/users`),
    );
    return data;
  }
}
