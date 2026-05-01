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
  html: (data) => `
    <h1>Reset your password</h1>
    <p>Hi ${data.email},</p>
    <p>We received a request to reset the password for your Atlas account.</p>
    <p>
      <a href="${data.resetLink}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
        Reset Password
      </a>
    </p>
    <p>This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    <p>— The Atlas Team</p>
  `,
};
