import { Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { NotificationService } from './notification/notification.service';

@Module({
  imports: [EmailModule],
  providers: [NotificationService],
})
export class NotificationModule {}
