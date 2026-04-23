import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';

@Controller('s')
export class UrlShortenerRedirectController {
  constructor(private readonly proxy: UrlShortenerProxyService) {}

  @Get(':slug')
  async redirect(@Param('slug') slug: string, @Res() res: Response) {
    const targetUrl = await this.proxy.resolveSlug(slug);
    return res.redirect(302, targetUrl);
  }
}
