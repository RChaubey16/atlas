import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { LinksModule } from './links/links.module';
import { RedirectModule } from './redirect/redirect.module';

@Module({
  imports: [ScheduleModule.forRoot(), LinksModule, RedirectModule],
  controllers: [AppController],
})
export class AppModule {}
