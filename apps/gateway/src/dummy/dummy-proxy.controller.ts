import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { DummyProxyService } from './dummy-proxy.service';
import { BlogDto } from './dto/blog.dto';
import { FakeUserDto } from './dto/fake-user.dto';

@ApiTags('dummy')
@Controller('dummy')
export class DummyProxyController {
  constructor(private readonly dummyProxy: DummyProxyService) {}

  @ApiOperation({ summary: 'Get sample blog posts — no auth required' })
  @ApiResponse({ status: 200, description: 'Array of 5 hardcoded blog objects', type: [BlogDto] })
  @Get('blogs')
  getBlogs() {
    return this.dummyProxy.getBlogs();
  }

  @ApiOperation({ summary: 'Get fake users — no auth required' })
  @ApiResponse({ status: 200, description: 'Array of 5 hardcoded fake user objects', type: [FakeUserDto] })
  @Get('users')
  getUsers() {
    return this.dummyProxy.getUsers();
  }
}
