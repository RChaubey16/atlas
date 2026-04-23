import { EmailTemplate } from '../email-template.interface';

interface PasswordResetData extends Record<string, unknown> {
  email: string;
  resetLink: string;
}

export class PasswordResetEmailTemplate implements EmailTemplate<PasswordResetData> {
  subject = 'Reset your Atlas password';

  html(data: PasswordResetData): string {
    return `
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
    `;
  }
}
