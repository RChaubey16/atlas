import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UrlShortenerProxyService } from './url-shortener-proxy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ShortLinkDto } from './dto/short-link.dto';
import { LinkAnalyticsDto } from './dto/link-analytics.dto';

interface AuthRequest extends Request {
  user: { userId: string; email: string };
}

@ApiTags('links')
@ApiBearerAuth('access-token')
@Controller('links')
@UseGuards(JwtAuthGuard)
export class UrlShortenerProxyController {
  constructor(private readonly proxy: UrlShortenerProxyService) {}

  @Throttle({ global: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new short link' })
  @ApiResponse({
    status: 201,
    description: 'Created short link',
    type: ShortLinkDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (invalid URL or slug)',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 409, description: 'Slug already in use' })
  @Post()
  create(@Body() body: CreateLinkDto, @Request() req: AuthRequest) {
    return this.proxy.createLink(body, req.user.userId);
  }

  @ApiOperation({
    summary: 'List all short links owned by the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: '1',
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: '20',
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of short links',
    type: [ShortLinkDto],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @Get()
  getMyLinks(
    @Request() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.proxy.getMyLinks(req.user.userId, page, limit);
  }

  @ApiOperation({ summary: 'Get click analytics for a specific short link' })
  @ApiParam({
    name: 'slug',
    example: 'my-link',
    description: 'The short link slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Click analytics',
    type: LinkAnalyticsDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Link belongs to another user' })
  @ApiResponse({ status: 404, description: 'Slug not found' })
  @Get(':slug/analytics')
  getLinkAnalytics(@Param('slug') slug: string, @Request() req: AuthRequest) {
    return this.proxy.getLinkAnalytics(slug, req.user.userId);
  }

  @ApiOperation({ summary: 'Update a short link' })
  @ApiParam({
    name: 'slug',
    example: 'my-link',
    description: 'The short link slug',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated short link',
    type: ShortLinkDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Link belongs to another user' })
  @ApiResponse({ status: 404, description: 'Slug not found' })
  @Patch(':slug')
  updateLink(
    @Param('slug') slug: string,
    @Body() body: UpdateLinkDto,
    @Request() req: AuthRequest,
  ) {
    return this.proxy.updateLink(slug, body, req.user.userId);
  }

  @ApiOperation({ summary: 'Delete a short link' })
  @ApiParam({
    name: 'slug',
    example: 'my-link',
    description: 'The short link slug',
  })
  @ApiResponse({ status: 200, description: 'Link deleted' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Link belongs to another user' })
  @ApiResponse({ status: 404, description: 'Slug not found' })
  @Delete(':slug')
  deleteLink(@Param('slug') slug: string, @Request() req: AuthRequest) {
    return this.proxy.deleteLink(slug, req.user.userId);
  }
}
