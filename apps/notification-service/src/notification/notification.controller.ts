import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { USER_CREATED_EVENT, UserCreatedEvent, SendEmailCommand } from '@app/contracts';
import { NotificationService } from './notification.service';
import { InternalKeyGuard } from '../guards/internal-key.guard';

@Controller('notify')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(USER_CREATED_EVENT)
  handleUserCreated(@Payload() event: UserCreatedEvent): Promise<void> {
    return this.notificationService.handleUserCreated(event);
  }

  @Post('send')
  @HttpCode(200)
  @UseGuards(InternalKeyGuard)
  sendEmail(@Body() command: SendEmailCommand): Promise<{ sent: number }> {
    return this.notificationService.sendEmail(command);
  }
}
