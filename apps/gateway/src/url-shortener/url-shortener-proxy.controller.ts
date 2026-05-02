import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('links')
@UseGuards(JwtAuthGuard)
export class UrlShortenerProxyController {
  constructor(private readonly proxy: UrlShortenerProxyService) {}

  @Throttle({ global: { limit: 20, ttl: 60000 } })
  @Post()
  create(@Body() body: unknown, @Request() req: AuthRequest) {
    return this.proxy.createLink(body, req.user.userId);
  }

  @Get()
  getMyLinks(
    @Request() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.proxy.getMyLinks(req.user.userId, page, limit);
  }

  @Get(':slug/analytics')
  getLinkAnalytics(@Param('slug') slug: string, @Request() req: AuthRequest) {
    return this.proxy.getLinkAnalytics(slug, req.user.userId);
  }

  @Patch(':slug')
  updateLink(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Request() req: AuthRequest,
  ) {
    return this.proxy.updateLink(slug, body, req.user.userId);
  }

  @Delete(':slug')
  deleteLink(@Param('slug') slug: string, @Request() req: AuthRequest) {
    return this.proxy.deleteLink(slug, req.user.userId);
  }
}
