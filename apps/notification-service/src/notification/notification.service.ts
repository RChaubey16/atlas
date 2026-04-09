import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { USER_CREATED_EVENT, UserCreatedEvent } from '@app/contracts';
import { EmailService } from '../email/email.service';
import { WelcomeEmailTemplate } from '../email/templates/welcome.template';

@Injectable()
export class NotificationService {
  constructor(private readonly emailService: EmailService) {}

  @EventPattern(USER_CREATED_EVENT)
  async handleUserCreated(@Payload() event: UserCreatedEvent): Promise<void> {
    console.log(`[Notification] Received ${USER_CREATED_EVENT}`, {
      userId: event.userId,
      email: event.email,
    });
    await this.emailService.sendMail(event.email, new WelcomeEmailTemplate());
  }
}
