import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { DummyModule } from './dummy/dummy.module';
import { UrlShortenerModule } from './url-shortener/url-shortener.module';
import { NotificationModule } from './notification/notification.module';
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        GATEWAY_PORT: Joi.number().default(3000),
        JWT_ACCESS_SECRET: Joi.string().required(),
        AUTH_SERVICE_URL: Joi.string().uri().required(),
        CONTENT_SERVICE_URL: Joi.string().uri().required(),
        URL_SHORTENER_URL: Joi.string().uri().required(),
        NOTIFICATION_SERVICE_URL: Joi.string()
          .uri()
          .default('http://localhost:3004'),
        INTERNAL_NOTIFICATION_KEY: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string()
          .uri()
          .default('http://localhost:3000/auth/google/callback'),
        ALLOWED_ORIGINS: Joi.string().default(''),
        FRONTEND_URL: Joi.string().uri(),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
    }),
    AuthModule,
    ContentModule,
    DummyModule,
    UrlShortenerModule,
    NotificationModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
