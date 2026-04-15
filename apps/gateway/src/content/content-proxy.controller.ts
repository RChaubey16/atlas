import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContentProxyService } from './content-proxy.service';
import { ContentItemDto } from './dto/content-item.dto';
import { CreateContentDto } from './dto/create-content.dto';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('content')
@ApiBearerAuth('access-token')
@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentProxyController {
  constructor(private readonly contentProxy: ContentProxyService) {}

  @ApiOperation({ summary: 'Create a new content item' })
  @ApiResponse({ status: 201, description: 'The created content item', type: ContentItemDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @Post()
  create(@Body() dto: CreateContentDto, @Request() req: AuthRequest) {
    return this.contentProxy.createContent(dto, req.user.userId);
  }

  @ApiOperation({ summary: 'List all content items owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'Array of content items', type: [ContentItemDto] })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @Get()
  getMyContent(@Request() req: AuthRequest) {
    return this.contentProxy.getMyContent(req.user.userId);
  }
}
