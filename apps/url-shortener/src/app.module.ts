import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { LinksModule } from './links/links.module';
import { RedirectModule } from './redirect/redirect.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        URL_SHORTENER_PORT: Joi.number().default(3003),
        DATABASE_URL: Joi.string().required(),
      }),
    }),
    ScheduleModule.forRoot(),
    LinksModule,
    RedirectModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
