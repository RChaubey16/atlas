import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContentDto, ownerId: string) {
    const item = await this.prisma.content.create({
      data: {
        title: dto.title,
        body: dto.body,
        ownerId,
      },
    });
    this.logger.log(`Content created ${item.id} owner=${ownerId}`);
    return item;
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
    if (item.ownerId !== ownerId) {
      this.logger.warn(
        `Forbidden: user ${ownerId} attempted to access content ${id}`,
      );
      throw new ForbiddenException();
    }
    return item;
  }
}
