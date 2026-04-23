import { EmailTemplate } from '../email-template.interface';

interface WelcomeData extends Record<string, unknown> {
  email: string;
}

export class WelcomeEmailTemplate implements EmailTemplate<WelcomeData> {
  subject = 'Welcome to Atlas!';

  html(data: WelcomeData): string {
    return `
      <h1>Welcome to Atlas!</h1>
      <p>Hi ${data.email},</p>
      <p>Your account has been successfully created. We're glad to have you on board.</p>
      <p>— The Atlas Team</p>
    `;
  }
}
