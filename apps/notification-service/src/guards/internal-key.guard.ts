import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class InternalKeyGuard implements CanActivate {
  private readonly expectedKey: string;

  constructor(configService: ConfigService) {
    this.expectedKey = configService.getOrThrow<string>(
      'INTERNAL_NOTIFICATION_KEY',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.headers['x-internal-key'];

    if (key !== this.expectedKey) {
      throw new UnauthorizedException('Invalid internal key');
    }
    return true;
  }
}
