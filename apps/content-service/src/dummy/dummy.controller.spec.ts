import { Test, TestingModule } from '@nestjs/testing';
import { DummyController } from './dummy.controller';
import { DummyService } from './dummy.service';

describe('DummyController', () => {
  let controller: DummyController;
  let service: DummyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DummyController],
      providers: [DummyService],
    }).compile();

    controller = module.get<DummyController>(DummyController);
    service = module.get<DummyService>(DummyService);
  });

  describe('getBlogs', () => {
    it('should return blogs from DummyService', () => {
      const blogs = controller.getBlogs();
      expect(blogs).toEqual(service.getBlogs());
      expect(blogs).toHaveLength(5);
    });
  });

  describe('getUsers', () => {
    it('should return users from DummyService', () => {
      const users = controller.getUsers();
      expect(users).toEqual(service.getUsers());
      expect(users).toHaveLength(5);
    });
  });
});
