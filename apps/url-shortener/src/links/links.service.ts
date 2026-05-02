import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

interface ShortLinkResponse {
  slug: string;
  targetUrl: string;
  expiresAt: Date;
  createdAt: Date;
  clickCount: number;
}

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLinkDto, userId: string): Promise<ShortLinkResponse> {
    const slug = dto.slug ?? (await this.generateUniqueSlug());

    if (dto.slug) {
      const existing = await this.prisma.shortLink.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) throw new ConflictException('Slug already in use');
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const link = await this.prisma.shortLink.create({
      data: { slug, targetUrl: dto.targetUrl, userId, expiresAt },
      include: { _count: { select: { clicks: true } } },
    });

    this.logger.log(`Link created slug=${slug} user=${userId}`);
    return this.toResponse(link, link._count.clicks);
  }

  async findAllByUser(userId: string): Promise<ShortLinkResponse[]> {
    const links = await this.prisma.shortLink.findMany({
      where: { userId },
      include: { _count: { select: { clicks: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return links.map((link) => this.toResponse(link, link._count.clicks));
  }

  async delete(slug: string, userId: string): Promise<void> {
    const link = await this.prisma.shortLink.findUnique({ where: { slug } });
    if (!link) throw new NotFoundException('Short link not found');
    if (link.userId !== userId) {
      this.logger.warn(
        `Forbidden: user ${userId} attempted to delete slug=${slug}`,
      );
      throw new ForbiddenException();
    }
    await this.prisma.shortLink.delete({ where: { slug } });
    this.logger.log(`Link deleted slug=${slug} user=${userId}`);
  }

  async resolveAndTrack(slug: string): Promise<string> {
    const link = await this.prisma.shortLink.findUnique({ where: { slug } });
    if (!link) throw new NotFoundException('Short link not found');
    if (link.expiresAt < new Date())
      throw new GoneException('Link has expired');
    await this.prisma.clickEvent.create({ data: { shortLinkId: link.id } });
    return link.targetUrl;
  }

  private async generateUniqueSlug(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const slug = this.generateSlug();
      const existing = await this.prisma.shortLink.findUnique({
        where: { slug },
      });
      if (!existing) return slug;
    }
    throw new InternalServerErrorException('Failed to generate unique slug');
  }

  private generateSlug(): string {
    return Array.from(randomBytes(6))
      .map((b) => CHARS[b % CHARS.length])
      .join('');
  }

  private toResponse(
    link: { slug: string; targetUrl: string; expiresAt: Date; createdAt: Date },
    clickCount: number,
  ): ShortLinkResponse {
    return {
      slug: link.slug,
      targetUrl: link.targetUrl,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      clickCount,
    };
  }
}
