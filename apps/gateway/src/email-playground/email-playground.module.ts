import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { EmailPlaygroundProxyController } from './email-playground-proxy.controller';
import { EmailPlaygroundProxyService } from './email-playground-proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [EmailPlaygroundProxyController],
  providers: [EmailPlaygroundProxyService],
})
export class EmailPlaygroundModule {}
