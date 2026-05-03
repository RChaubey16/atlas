import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { EmailPlaygroundController } from './email-playground.controller';
import { EmailPlaygroundService } from './email-playground.service';

@Module({
  imports: [EmailModule],
  controllers: [EmailPlaygroundController],
  providers: [EmailPlaygroundService],
})
export class EmailPlaygroundModule {}
