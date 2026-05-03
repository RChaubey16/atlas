import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailTemplate } from './email-template.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(configService: ConfigService) {
    this.resend = new Resend(
      configService.getOrThrow<string>('RESEND_API_KEY'),
    );
    this.from = configService.get<string>(
      'SMTP_FROM',
      'Atlas <onboarding@resend.dev>',
    );
  }

  async sendRaw(to: string, subject: string, html: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });
    if (error) throw new Error(error.message);
  }

  async sendMail(
    to: string,
    template: EmailTemplate,
    templateData: Record<string, unknown> = {},
  ): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: template.subject,
      html: template.html(templateData),
    });

    if (error) {
      this.logger.error(`[Email] Failed to send to ${to}:`, error);
      return;
    }

    this.logger.log(
      `[Email] Sent "${template.subject}" to ${to} (id: ${data?.id})`,
    );
  }
}
