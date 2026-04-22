import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationProxyController } from './notification-proxy.controller';
import { NotificationProxyService } from './notification-proxy.service';

@Module({
  imports: [HttpModule],
  controllers: [NotificationProxyController],
  providers: [NotificationProxyService],
})
export class NotificationModule {}
