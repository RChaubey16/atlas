import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = process.env.CONTENT_SERVICE_PORT ?? 3002;
  await app.listen(port);
  logger.log(`Content service listening on port ${port}`);
}
void bootstrap();
