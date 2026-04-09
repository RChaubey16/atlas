import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailTemplate } from './email-template.interface';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(to: string, template: EmailTemplate): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: template.subject,
        html: template.html({ email: to }),
      });
      console.log(`[Email] Sent "${template.subject}" to ${to}`);
    } catch (error) {
      console.error(`[Email] Failed to send to ${to}:`, error);
    }
  }
}
