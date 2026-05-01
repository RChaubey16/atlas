import { TemplateDefinition } from './template.interface';
import { welcomeTemplate } from './welcome.template';
import { passwordResetTemplate } from './password-reset.template';
import { featureAnnouncementTemplate } from './feature-announcement.template';

export const TEMPLATES: Record<string, TemplateDefinition> = {
  [welcomeTemplate.id]: welcomeTemplate,
  [passwordResetTemplate.id]: passwordResetTemplate,
  [featureAnnouncementTemplate.id]: featureAnnouncementTemplate,
};
