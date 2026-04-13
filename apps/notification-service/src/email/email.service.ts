import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailTemplate } from './email-template.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  async sendMail(to: string, template: EmailTemplate): Promise<void> {
    try {
      await this.resend.emails.send({
        from: process.env.SMTP_FROM ?? 'Atlas <onboarding@resend.dev>',
        to,
        subject: template.subject,
        html: template.html({ email: to }),
      });
      this.logger.log(`[Email] Sent "${template.subject}" to ${to}`);
    } catch (error) {
      this.logger.error(`[Email] Failed to send to ${to}:`, error);
    }
  }
}
