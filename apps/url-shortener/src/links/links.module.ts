import { Module } from '@nestjs/common';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LinksController],
  providers: [LinksService, CleanupService, PrismaService],
  exports: [LinksService],
})
export class LinksModule {}
