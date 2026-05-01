import { Injectable, Logger } from '@nestjs/common';
import {
  UserCreatedEvent,
  USER_CREATED_EVENT,
  SendEmailCommand,
} from '@app/contracts';
import { EmailService } from '../email/email.service';
import { TemplateRegistry } from '../email/template-registry';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly templateRegistry: TemplateRegistry,
  ) {}

  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    this.logger.log(`[Notification] Received ${USER_CREATED_EVENT}`, {
      userId: event.userId,
      email: event.email,
    });
    const template = this.templateRegistry.get('welcome');
    await this.emailService.sendMail(event.email, template, {
      email: event.email,
    });
  }

  async sendEmail(command: SendEmailCommand): Promise<{ sent: number }> {
    const template = this.templateRegistry.get(command.templateId);
    await Promise.all(
      command.to.map((address) =>
        this.emailService.sendMail(address, template, {
          ...command.templateData,
          email: address,
        }),
      ),
    );
    this.logger.log(
      `[Notification] Sent "${command.templateId}" to ${command.to.length} recipient(s)`,
    );
    return { sent: command.to.length };
  }
}
