import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ContentProxyController } from './content-proxy.controller';
import { ContentProxyService } from './content-proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [ContentProxyController],
  providers: [ContentProxyService],
})
export class ContentModule {}
