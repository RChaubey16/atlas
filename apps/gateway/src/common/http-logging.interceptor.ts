import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        this.logger.log(
          `${method} ${url} ${res.statusCode} +${Date.now() - start}ms`,
        );
      }),
      catchError((err: unknown) => {
        const status = (err as { status?: number })?.status ?? 500;
        this.logger.warn(`${method} ${url} ${status} +${Date.now() - start}ms`);
        return throwError(() => err);
      }),
    );
  }
}
