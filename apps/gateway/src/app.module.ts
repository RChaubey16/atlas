import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { DummyModule } from './dummy/dummy.module';
import { UrlShortenerModule } from './url-shortener/url-shortener.module';
import { NotificationModule } from './notification/notification.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AuthModule, ContentModule, DummyModule, UrlShortenerModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
