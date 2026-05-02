import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { NotificationController } from './notification/notification.controller';
import { NotificationService } from './notification/notification.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NOTIFICATION_SERVICE_PORT: Joi.number().default(3004),
        RABBITMQ_URL: Joi.string().default('amqp://guest:guest@localhost:5672'),
        RESEND_API_KEY: Joi.string().required(),
        SMTP_FROM: Joi.string().default('Atlas <onboarding@resend.dev>'),
        INTERNAL_NOTIFICATION_KEY: Joi.string().required(),
      }),
    }),
    EmailModule,
    HealthModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
