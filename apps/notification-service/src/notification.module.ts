import { Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { NotificationController } from './notification/notification.controller';
import { NotificationService } from './notification/notification.service';

@Module({
  imports: [EmailModule],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
