import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      message: 'Welcome to Atlas',
      version: '1.0.0',
      docs: '/docs',
    };
  }
}
