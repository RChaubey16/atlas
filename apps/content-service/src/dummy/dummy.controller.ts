import { Controller, Get } from '@nestjs/common';
import { DummyService, Blog, FakeUser } from './dummy.service';

@Controller('dummy')
export class DummyController {
  constructor(private readonly dummyService: DummyService) {}

  @Get('blogs')
  getBlogs(): Blog[] {
    return this.dummyService.getBlogs();
  }

  @Get('users')
  getUsers(): FakeUser[] {
    return this.dummyService.getUsers();
  }
}
