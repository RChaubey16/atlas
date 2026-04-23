import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);

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
  console.log(`[Notification Service] HTTP listening on port ${port}`);
  console.log('[Notification Service] RMQ listening on notification_queue');
}
void bootstrap();
