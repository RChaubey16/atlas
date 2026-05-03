import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserTemplateDto } from './dto/create-user-template.dto';

@Injectable()
export class UserTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateUserTemplateDto) {
    return this.prisma.userTemplate.create({
      data: { userId, ...dto },
    });
  }

  findAllByUser(userId: string) {
    return this.prisma.userTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const template = await this.prisma.userTemplate.findUnique({
      where: { id },
    });
    if (!template || template.userId !== userId) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async delete(id: string, userId: string): Promise<void> {
    const template = await this.prisma.userTemplate.findUnique({
      where: { id },
    });
    if (!template || template.userId !== userId) {
      throw new NotFoundException('Template not found');
    }
    await this.prisma.userTemplate.delete({ where: { id } });
  }
}
