import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
        queue: 'notification_queue',
        queueOptions: { durable: true },
        socketOptions: { heartbeatIntervalInSeconds: 5 },
      },
    },
  );
  await app.listen();
  console.log('[Notification Service] Listening on notification_queue');
}
bootstrap();
