import { Controller, Get, Param, Redirect } from '@nestjs/common';
import { LinksService } from '../links/links.service';

@Controller('s')
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':slug')
  @Redirect()
  async redirect(@Param('slug') slug: string) {
    const url = await this.linksService.resolveAndTrack(slug);
    return { url, statusCode: 302 };
  }
}
