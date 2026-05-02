import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { ContentModule } from './content/content.module';
import { DummyModule } from './dummy/dummy.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        CONTENT_SERVICE_PORT: Joi.number().default(3002),
        DATABASE_URL: Joi.string().required(),
      }),
    }),
    ContentModule,
    DummyModule,
    HealthModule,
  ],
})
export class AppModule {}
