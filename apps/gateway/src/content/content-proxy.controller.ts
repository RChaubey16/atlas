import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ContentProxyService } from './content-proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentProxyController {
  constructor(private readonly contentProxy: ContentProxyService) {}

  @Post()
  create(@Body() body: unknown, @Request() req: AuthRequest) {
    return this.contentProxy.createContent(body, req.user.userId);
  }

  @Get()
  getMyContent(@Request() req: AuthRequest) {
    return this.contentProxy.getMyContent(req.user.userId);
  }
}
