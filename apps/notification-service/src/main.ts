import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(NotificationModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      queue: 'notification_queue',
      queueOptions: { durable: true },
      socketOptions: { heartbeatIntervalInSeconds: 5 },
    },
  });

  await app.startAllMicroservices();

  const port = process.env.NOTIFICATION_SERVICE_PORT ?? 3004;
  await app.listen(port);
  logger.log(`Notification service HTTP listening on port ${port}`);
  logger.log('Notification service RMQ listening on notification_queue');
}
void bootstrap();
