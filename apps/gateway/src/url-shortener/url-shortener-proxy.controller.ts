import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('links')
@UseGuards(JwtAuthGuard)
export class UrlShortenerProxyController {
  constructor(private readonly proxy: UrlShortenerProxyService) {}

  @Post()
  create(@Body() body: unknown, @Request() req: AuthRequest) {
    return this.proxy.createLink(body, req.user.userId);
  }

  @Get()
  getMyLinks(@Request() req: AuthRequest) {
    return this.proxy.getMyLinks(req.user.userId);
  }

  @Delete(':slug')
  deleteLink(@Param('slug') slug: string, @Request() req: AuthRequest) {
    return this.proxy.deleteLink(slug, req.user.userId);
  }
}
