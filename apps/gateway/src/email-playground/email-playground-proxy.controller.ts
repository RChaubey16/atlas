import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailPlaygroundProxyService } from './email-playground-proxy.service';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('email-playground')
@Controller('email-templates')
export class EmailPlaygroundProxyController {
  constructor(private readonly proxy: EmailPlaygroundProxyService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create an email template' })
  create(@Body() body: unknown, @Request() req: AuthRequest) {
    return this.proxy.create(body, req.user.userId);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List email templates for the authenticated user' })
  findAll(@Request() req: AuthRequest) {
    return this.proxy.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single email template' })
  findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.proxy.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update an email template' })
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Request() req: AuthRequest,
  ) {
    return this.proxy.update(id, body, req.user.userId);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an email template' })
  async remove(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.proxy.remove(id, req.user.userId);
  }

  @Post('render')
  @ApiOperation({ summary: 'Render blocks JSON to email-safe HTML (no auth required)' })
  renderHtml(@Body() body: unknown) {
    return this.proxy.renderHtml(body);
  }

  @Post('send-test')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send a test email for a saved template' })
  sendTest(@Body() body: unknown, @Request() req: AuthRequest) {
    return this.proxy.sendTest(body, req.user.userId);
  }
}
