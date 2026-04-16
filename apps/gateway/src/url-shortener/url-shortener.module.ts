import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';
import { UrlShortenerProxyController } from './url-shortener-proxy.controller';
import { UrlShortenerRedirectController } from './url-shortener-redirect.controller';

@Module({
  imports: [HttpModule],
  controllers: [UrlShortenerProxyController, UrlShortenerRedirectController],
  providers: [UrlShortenerProxyService],
})
export class UrlShortenerModule {}
