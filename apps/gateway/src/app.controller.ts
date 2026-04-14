import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Gateway health / welcome info' })
  @ApiResponse({ status: 200, description: 'Returns service name, version, and docs URL' })
  @Get()
  getHello() {
    return this.appService.getHello();
  }
}
