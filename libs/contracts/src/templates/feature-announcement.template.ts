import { TemplateDefinition } from './template.interface';

export const featureAnnouncementTemplate: TemplateDefinition = {
  id: 'feature-announcement',
  name: 'Feature Announcement',
  description: 'Announces a new product feature to users.',
  subject: "What's new in Atlas",
  fields: [
    { name: 'email', required: true, description: 'Recipient email address' },
    { name: 'featureName', required: true, description: 'Name of the new feature' },
    { name: 'description', required: true, description: 'Short description of the feature' },
    { name: 'ctaLabel', required: false, description: 'Call-to-action button label' },
    { name: 'ctaUrl', required: false, description: 'Call-to-action button URL' },
  ],
  previewData: {
    email: 'alice@example.com',
    featureName: 'URL Shortener',
    description: 'You can now create short links with click tracking.',
    ctaLabel: 'Try it now',
    ctaUrl: 'https://app.example.com/links',
  },
  html: (data) => {
    const cta = data.ctaUrl
      ? `<p><a href="${data.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">${data.ctaLabel ?? 'Learn more'}</a></p>`
      : '';
    return `
      <h1>${data.featureName}</h1>
      <p>Hi ${data.email},</p>
      <p>${data.description}</p>
      ${cta}
      <p>— The Atlas Team</p>
    `;
  },
};
