import { TemplateDefinition } from './template.interface';

export const passwordResetTemplate: TemplateDefinition = {
  id: 'password-reset',
  name: 'Password Reset',
  description: 'Sent when a user requests a password reset.',
  subject: 'Reset your Atlas password',
  fields: [
    { name: 'email', required: true, description: 'Recipient email address' },
    {
      name: 'resetLink',
      required: true,
      description: 'URL the user clicks to reset their password',
    },
  ],
  previewData: {
    email: 'alice@example.com',
    resetLink: 'https://app.example.com/reset?token=preview',
  },
  html: (data) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Atlas password</title>
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
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Reset your password</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Hi ${data.email},</p>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#475569;">We received a request to reset the password for your Atlas account. Click the button below to choose a new password.</p>
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-radius:8px;background-color:#4f46e5;">
                    <a href="${data.resetLink}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#64748b;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
              <p style="margin:0;font-size:15px;color:#64748b;">— The Atlas Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e2e8f0;background-color:#f8fafc;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">© 2025 Atlas · If you're having trouble clicking the button, copy and paste this URL into your browser: <span style="color:#6366f1;">${data.resetLink}</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
};
