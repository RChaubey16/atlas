import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateContentDto, ownerId: string) {
    return this.prisma.content.create({
      data: {
        title: dto.title,
        body: dto.body,
        ownerId,
      },
    });
  }

  findAllByOwner(ownerId: string) {
    return this.prisma.content.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneByOwner(id: string, ownerId: string) {
    const item = await this.prisma.content.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Content not found');
    if (item.ownerId !== ownerId) throw new ForbiddenException();
    return item;
  }
}
