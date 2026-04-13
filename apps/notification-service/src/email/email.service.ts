import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as dns from 'dns';
import * as nodemailer from 'nodemailer';
import { EmailTemplate } from './email-template.interface';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  async onModuleInit() {
    const smtpHost = process.env.SMTP_HOST ?? 'smtp.gmail.com';

    // Nodemailer v8 resolves both A and AAAA records regardless of the `family`
    // option, then tries them in order. On hosts with an IPv6 interface but no
    // IPv6 route to the internet this causes ENETUNREACH. Pre-resolving to an
    // IPv4 address and passing it as `host` bypasses that logic entirely
    // (nodemailer skips DNS when the host is already an IP address). The
    // original hostname is kept as TLS `servername` so SNI continues to work.
    let resolvedHost = smtpHost;
    try {
      const addresses = await dns.promises.resolve4(smtpHost);
      if (addresses.length > 0) {
        resolvedHost = addresses[0];
        this.logger.log(`[Email] Resolved ${smtpHost} → ${resolvedHost} (IPv4)`);
      }
    } catch {
      this.logger.warn(`[Email] dns.resolve4 failed for ${smtpHost}, falling back to hostname`);
    }

    this.transporter = nodemailer.createTransport({
      host: resolvedHost,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        servername: smtpHost,
      },
    } as nodemailer.TransportOptions);
  }

  async sendMail(to: string, template: EmailTemplate): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
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
