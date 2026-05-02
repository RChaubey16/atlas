import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  async create(
    @Body() dto: CreateLinkDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.create(dto, userId);
  }

  @Get()
  async findAll(
    @Headers('x-user-id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '20', 10) || 20),
    );
    return this.linksService.findAllByUser(userId, pageNum, limitNum);
  }

  @Get(':slug/analytics')
  async getAnalytics(
    @Param('slug') slug: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.getAnalytics(slug, userId);
  }

  @Patch(':slug')
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateLinkDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.update(slug, dto, userId);
  }

  @Delete(':slug')
  async delete(
    @Param('slug') slug: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.delete(slug, userId);
  }
}
