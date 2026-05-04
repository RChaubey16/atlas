import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';

@ApiTags('links')
@Controller('s')
export class UrlShortenerRedirectController {
  constructor(private readonly proxy: UrlShortenerProxyService) {}

  @ApiOperation({
    summary: 'Resolve a short link and redirect to the target URL',
  })
  @ApiParam({
    name: 'slug',
    example: 'my-link',
    description: 'The short link slug',
  })
  @ApiResponse({ status: 302, description: 'Redirects to the target URL' })
  @ApiResponse({ status: 404, description: 'Slug not found' })
  @ApiResponse({ status: 410, description: 'Link has expired' })
  @Get(':slug')
  async redirect(@Param('slug') slug: string, @Res() res: Response) {
    const targetUrl = await this.proxy.resolveSlug(slug);
    return res.redirect(302, targetUrl);
  }
}
