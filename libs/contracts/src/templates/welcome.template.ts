import { TemplateDefinition } from './template.interface';

export const welcomeTemplate: TemplateDefinition = {
  id: 'welcome',
  name: 'Welcome',
  description: 'Sent to new users after successful registration.',
  subject: 'Welcome to Atlas!',
  fields: [
    { name: 'email', required: true, description: 'Recipient email address' },
  ],
  previewData: { email: 'alice@example.com' },
  html: (data) => `
    <h1>Welcome to Atlas!</h1>
    <p>Hi ${data.email},</p>
    <p>Your account has been successfully created. We're glad to have you on board.</p>
    <p>— The Atlas Team</p>
  `,
};
