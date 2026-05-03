import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTemplatesProxyService } from './user-templates-proxy.service';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('user-templates')
@ApiBearerAuth('access-token')
@Controller('user-templates')
@UseGuards(JwtAuthGuard)
export class UserTemplatesProxyController {
  constructor(private readonly proxy: UserTemplatesProxyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom email template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  create(@Body() body: unknown, @Request() req: AuthRequest) {
    return this.proxy.create(req.user.userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List your custom email templates' })
  findAll(@Request() req: AuthRequest) {
    return this.proxy.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one custom email template by ID' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.proxy.findOne(id, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a custom email template' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  delete(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.proxy.delete(id, req.user.userId);
  }
}
