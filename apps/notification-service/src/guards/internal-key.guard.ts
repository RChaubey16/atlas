import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.headers['x-internal-key'];
    const expected = process.env.INTERNAL_NOTIFICATION_KEY;

    if (!expected) {
      throw new UnauthorizedException('Internal key not configured');
    }
    if (key !== expected) {
      throw new UnauthorizedException('Invalid internal key');
    }
    return true;
  }
}
