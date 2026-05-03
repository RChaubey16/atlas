import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { InternalKeyGuard } from '../guards/internal-key.guard';
import { UserTemplatesService } from './user-templates.service';
import { CreateUserTemplateDto } from './dto/create-user-template.dto';

@Controller('user-templates')
@UseGuards(InternalKeyGuard)
export class UserTemplatesController {
  constructor(private readonly service: UserTemplatesService) {}

  @Post()
  create(
    @Body() dto: CreateUserTemplateDto,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new UnauthorizedException();
    return this.service.create(userId, dto);
  }

  @Get()
  findAll(@Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.service.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.service.findOne(id, userId);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    await this.service.delete(id, userId);
  }
}
