import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { TemplateRegistry } from './template-registry';

@Module({
  providers: [EmailService, TemplateRegistry],
  exports: [EmailService, TemplateRegistry],
})
export class EmailModule {}
