import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the welcome payload with docs link pointing to /docs', () => {
      expect(appController.getHello()).toEqual({
        message: 'Welcome to Atlas',
        version: '1.0.0',
        docs: '/docs',
      });
    });
  });
});
