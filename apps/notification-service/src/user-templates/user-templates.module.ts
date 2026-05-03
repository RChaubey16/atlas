import { Module } from '@nestjs/common';
import { UserTemplatesController } from './user-templates.controller';
import { UserTemplatesService } from './user-templates.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [UserTemplatesController],
  providers: [UserTemplatesService, PrismaService],
})
export class UserTemplatesModule {}
