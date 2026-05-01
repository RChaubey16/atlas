import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { SendEmailCommand } from '@app/contracts';

@Injectable()
export class NotificationProxyService {
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

  async sendEmail(command: SendEmailCommand): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>(
          `${this.notificationUrl}/notify/send`,
          command,
          {
            headers: { 'x-internal-key': this.internalKey },
          },
        ),
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
      throw new HttpException(
        { ...data, displayErrorMessage: message },
        status,
      );
    }
    throw err as Error;
  }
}
