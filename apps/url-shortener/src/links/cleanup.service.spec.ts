import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CleanupService', () => {
  let service: CleanupService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        {
          provide: PrismaService,
          useValue: {
            shortLink: {
              deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
    prisma = module.get(PrismaService);
  });

  describe('deleteExpiredLinks', () => {
    it('should delete all ShortLink rows where expiresAt is in the past', async () => {
      await service.deleteExpiredLinks();

      expect(prisma.shortLink.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });
});
