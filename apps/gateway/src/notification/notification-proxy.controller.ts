import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationProxyService } from './notification-proxy.service';
import { SendEmailDto } from './dto/send-email.dto';

@ApiTags('notification')
@ApiBearerAuth('access-token')
@Controller('notify')
@UseGuards(JwtAuthGuard)
export class NotificationProxyController {
  constructor(private readonly notificationProxy: NotificationProxyService) {}

  @ApiOperation({ summary: 'Send an email using a named template' })
  @ApiResponse({ status: 200, description: 'Number of emails sent' })
  @ApiResponse({ status: 400, description: 'Unknown templateId or invalid payload' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @Post('send')
  sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationProxy.sendEmail(dto);
  }
}
