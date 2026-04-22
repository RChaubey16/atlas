import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailTemplate } from './email-template.interface';
import { WelcomeEmailTemplate } from './templates/welcome.template';
import { PasswordResetEmailTemplate } from './templates/password-reset.template';
import { FeatureAnnouncementEmailTemplate } from './templates/feature-announcement.template';

const TEMPLATES: Record<string, EmailTemplate> = {
  welcome: new WelcomeEmailTemplate(),
  'password-reset': new PasswordResetEmailTemplate(),
  'feature-announcement': new FeatureAnnouncementEmailTemplate(),
};

@Injectable()
export class TemplateRegistry {
  get(templateId: string): EmailTemplate {
    const template = TEMPLATES[templateId];
    if (!template) {
      throw new NotFoundException(`Email template "${templateId}" not found`);
    }
    return template;
  }

  listIds(): string[] {
    return Object.keys(TEMPLATES);
  }
}
