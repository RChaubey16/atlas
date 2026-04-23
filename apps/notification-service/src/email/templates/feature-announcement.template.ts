import { EmailTemplate } from '../email-template.interface';

interface FeatureAnnouncementData extends Record<string, unknown> {
  email: string;
  featureName: string;
  description: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export class FeatureAnnouncementEmailTemplate implements EmailTemplate<FeatureAnnouncementData> {
  subject = "What's new in Atlas";

  html(data: FeatureAnnouncementData): string {
    const cta =
      data.ctaUrl
        ? `<p>
            <a href="${data.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
              ${data.ctaLabel ?? 'Learn more'}
            </a>
           </p>`
        : '';

    return `
      <h1>${data.featureName}</h1>
      <p>Hi ${data.email},</p>
      <p>${data.description}</p>
      ${cta}
      <p>— The Atlas Team</p>
    `;
  }
}
