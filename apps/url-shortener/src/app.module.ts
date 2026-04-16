import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LinksModule } from './links/links.module';

@Module({
  imports: [LinksModule],
  controllers: [AppController],
})
export class AppModule {}
