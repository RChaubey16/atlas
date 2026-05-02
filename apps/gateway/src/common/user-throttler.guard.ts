import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { userId?: string } | undefined;
    const key = user?.userId ?? (req as unknown as Request).ip ?? 'unknown';
    return Promise.resolve(key);
  }
}
