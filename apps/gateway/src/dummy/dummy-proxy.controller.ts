import { Controller, Get } from '@nestjs/common';
import { DummyProxyService } from './dummy-proxy.service';

@Controller('dummy')
export class DummyProxyController {
  constructor(private readonly dummyProxy: DummyProxyService) {}

  @Get('blogs')
  getBlogs() {
    return this.dummyProxy.getBlogs();
  }

  @Get('users')
  getUsers() {
    return this.dummyProxy.getUsers();
  }
}
