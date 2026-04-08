import { DummyService } from './dummy.service';

describe('DummyService', () => {
  let service: DummyService;

  beforeEach(() => {
    service = new DummyService();
  });

  describe('getBlogs', () => {
    it('should return an array of 5 blogs', () => {
      const blogs = service.getBlogs();
      expect(blogs).toHaveLength(5);
    });

    it('each blog should have id, title, body, author, createdAt', () => {
      const blogs = service.getBlogs();
      for (const blog of blogs) {
        expect(blog).toHaveProperty('id');
        expect(blog).toHaveProperty('title');
        expect(blog).toHaveProperty('body');
        expect(blog).toHaveProperty('author');
        expect(blog).toHaveProperty('createdAt');
      }
    });
  });

  describe('getUsers', () => {
    it('should return an array of 5 users', () => {
      const users = service.getUsers();
      expect(users).toHaveLength(5);
    });

    it('each user should have id, name, email, avatarUrl', () => {
      const users = service.getUsers();
      for (const user of users) {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('avatarUrl');
      }
    });
  });
});
