import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *')
  async deleteExpiredLinks(): Promise<void> {
    await this.prisma.shortLink.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
