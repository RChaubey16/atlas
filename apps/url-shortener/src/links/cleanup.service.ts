import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *')
  async deleteExpiredLinks(): Promise<void> {
    const result = await this.prisma.shortLink.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(`Cleanup: deleted ${result.count} expired link(s)`);
  }
}
