import { TemplateDefinition } from './template.interface';

export const featureAnnouncementTemplate: TemplateDefinition = {
  id: 'feature-announcement',
  name: 'Feature Announcement',
  description: 'Announces a new product feature to users.',
  subject: "What's new in Atlas",
  fields: [
    { name: 'email', required: true, description: 'Recipient email address' },
    {
      name: 'featureName',
      required: true,
      description: 'Name of the new feature',
    },
    {
      name: 'description',
      required: true,
      description: 'Short description of the feature',
    },
    {
      name: 'ctaLabel',
      required: false,
      description: 'Call-to-action button label',
    },
    {
      name: 'ctaUrl',
      required: false,
      description: 'Call-to-action button URL',
    },
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
      ? `<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-radius:8px;background-color:#4f46e5;">
                    <a href="${data.ctaUrl}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${data.ctaLabel ?? 'Learn more'}</a>
                  </td>
                </tr>
              </table>`
      : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>What's new in Atlas</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px 0 rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#4f46e5;padding:28px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Atlas</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 12px;background-color:#ede9fe;text-align:center;">
              <span style="font-size:12px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:0.08em;">What's New</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 32px;">
              <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${data.featureName}</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Hi ${data.email},</p>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#475569;">${data.description}</p>
              ${cta}
              <p style="margin:0;font-size:15px;color:#64748b;">— The Atlas Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e2e8f0;background-color:#f8fafc;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">© 2025 Atlas · You're receiving this as a registered user of Atlas.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  },
};
