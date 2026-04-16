import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { LinksModule } from './links/links.module';

@Module({
  imports: [ScheduleModule.forRoot(), LinksModule],
  controllers: [AppController],
})
export class AppModule {}
