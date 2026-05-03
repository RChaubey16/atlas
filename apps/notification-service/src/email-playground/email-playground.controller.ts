import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { RenderTemplateDto } from './dto/render-template.dto';
import { SendTestDto } from './dto/send-test.dto';
import { EmailPlaygroundService } from './email-playground.service';

function requireUserId(userId: string | undefined): asserts userId is string {
  if (!userId) throw new UnauthorizedException();
}

@Controller('email-templates')
export class EmailPlaygroundController {
  constructor(private readonly service: EmailPlaygroundService) {}

  @Post()
  create(
    @Body() dto: CreateEmailTemplateDto,
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId);
    return this.service.create(dto, userId);
  }

  @Get()
  findAll(@Headers('x-user-id') userId: string) {
    requireUserId(userId);
    return this.service.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    requireUserId(userId);
    return this.service.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId);
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    requireUserId(userId);
    await this.service.remove(id, userId);
  }

  @Post('render')
  renderHtml(@Body() dto: RenderTemplateDto) {
    return this.service.render(dto);
  }

  @Post('send-test')
  sendTest(
    @Body() dto: SendTestDto,
    @Headers('x-user-id') userId: string,
  ) {
    requireUserId(userId);
    return this.service.sendTest(dto, userId);
  }
}
