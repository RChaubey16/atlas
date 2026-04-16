import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';

@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  async create(@Body() dto: CreateLinkDto, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.create(dto, userId);
  }

  @Get()
  async findAll(@Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.findAllByUser(userId);
  }

  @Delete(':slug')
  async delete(@Param('slug') slug: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.linksService.delete(slug, userId);
  }
}
