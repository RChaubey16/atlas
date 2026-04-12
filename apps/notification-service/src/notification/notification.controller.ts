import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { USER_CREATED_EVENT, UserCreatedEvent } from '@app/contracts';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @EventPattern(USER_CREATED_EVENT)
  handleUserCreated(@Payload() event: UserCreatedEvent): Promise<void> {
    return this.notificationService.handleUserCreated(event);
  }
}
