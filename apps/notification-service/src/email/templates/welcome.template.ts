import { EmailTemplate } from '../email-template.interface';

export class WelcomeEmailTemplate implements EmailTemplate {
  subject = 'Welcome to Atlas!';

  html(data: { email: string }): string {
    return `
      <h1>Welcome to Atlas!</h1>
      <p>Hi ${data.email},</p>
      <p>Your account has been successfully created. We're glad to have you on board.</p>
      <p>— The Atlas Team</p>
    `;
  }
}
