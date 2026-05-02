import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = process.env.URL_SHORTENER_PORT ?? 3003;
  await app.listen(port);
  logger.log(`URL shortener listening on port ${port}`);
}
void bootstrap();
