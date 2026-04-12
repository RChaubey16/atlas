import { Injectable, Logger } from '@nestjs/common';
import { UserCreatedEvent, USER_CREATED_EVENT } from '@app/contracts';
import { EmailService } from '../email/email.service';
import { WelcomeEmailTemplate } from '../email/templates/welcome.template';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly emailService: EmailService) {}

  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    this.logger.log(`[Notification] Received ${USER_CREATED_EVENT}`, {
      userId: event.userId,
      email: event.email,
    });
    await this.emailService.sendMail(event.email, new WelcomeEmailTemplate());
  }
}
