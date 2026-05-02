import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness — confirms the gateway process is running',
  })
  liveness() {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness — pings all downstream services' })
  readiness() {
    return this.health.check([
      () =>
        this.http.pingCheck(
          'auth-service',
          `${this.config.get<string>('AUTH_SERVICE_URL')}/health`,
        ),
      () =>
        this.http.pingCheck(
          'content-service',
          `${this.config.get<string>('CONTENT_SERVICE_URL')}/health`,
        ),
      () =>
        this.http.pingCheck(
          'url-shortener',
          `${this.config.get<string>('URL_SHORTENER_URL')}/health`,
        ),
    ]);
  }
}
