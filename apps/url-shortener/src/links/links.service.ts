import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

interface ShortLinkResponse {
  slug: string;
  targetUrl: string;
  expiresAt: Date | null;
  createdAt: Date;
  clickCount: number;
}

interface PaginatedLinksResponse {
  data: ShortLinkResponse[];
  total: number;
  page: number;
  pages: number;
}

interface AnalyticsResponse {
  totalClicks: number;
  clicksByDay: Array<{ date: string; count: number }>;
  lastClickedAt: string | null;
}

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLinkDto, userId: string): Promise<ShortLinkResponse> {
    await this.validateNoSsrf(dto.targetUrl);

    const slug = dto.slug ?? (await this.generateUniqueSlug());

    if (dto.slug) {
      const existing = await this.prisma.shortLink.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) throw new ConflictException('Slug already in use');
    }

    const expiresAt = this.buildExpiry(dto.noExpiry, dto.expiresInDays);

    const link = await this.prisma.shortLink.create({
      data: { slug, targetUrl: dto.targetUrl, userId, expiresAt },
      include: { _count: { select: { clicks: true } } },
    });

    this.logger.log(`Link created slug=${slug} user=${userId}`);
    return this.toResponse(link, link._count.clicks);
  }

  async findAllByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedLinksResponse> {
    const skip = (page - 1) * limit;
    const [links, total] = await Promise.all([
      this.prisma.shortLink.findMany({
        where: { userId },
        include: { _count: { select: { clicks: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shortLink.count({ where: { userId } }),
    ]);
    return {
      data: links.map((l) => this.toResponse(l, l._count.clicks)),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async update(
    slug: string,
    dto: UpdateLinkDto,
    userId: string,
  ): Promise<ShortLinkResponse> {
    if (
      dto.targetUrl === undefined &&
      dto.expiresInDays === undefined &&
      dto.noExpiry === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    const link = await this.prisma.shortLink.findUnique({ where: { slug } });
    if (!link) throw new NotFoundException('Short link not found');
    if (link.userId !== userId) {
      this.logger.warn(
        `Forbidden: user ${userId} attempted to update slug=${slug}`,
      );
      throw new ForbiddenException();
    }

    if (dto.targetUrl) await this.validateNoSsrf(dto.targetUrl);

    const updateData: { targetUrl?: string; expiresAt?: Date | null } = {};
    if (dto.targetUrl !== undefined) updateData.targetUrl = dto.targetUrl;
    if (dto.noExpiry === true) {
      updateData.expiresAt = null;
    } else if (dto.expiresInDays !== undefined) {
      updateData.expiresAt = new Date(
        Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000,
      );
    }

    const updated = await this.prisma.shortLink.update({
      where: { slug },
      data: updateData,
      include: { _count: { select: { clicks: true } } },
    });

    this.logger.log(`Link updated slug=${slug} user=${userId}`);
    return this.toResponse(updated, updated._count.clicks);
  }

  async getAnalytics(slug: string, userId: string): Promise<AnalyticsResponse> {
    const link = await this.prisma.shortLink.findUnique({ where: { slug } });
    if (!link) throw new NotFoundException('Short link not found');
    if (link.userId !== userId) throw new ForbiddenException();

    const [totalClicks, clicksByDayRaw, lastClick] = await Promise.all([
      this.prisma.clickEvent.count({ where: { shortLinkId: link.id } }),
      this.prisma.$queryRaw<Array<{ date: Date; count: number }>>`
        SELECT
          DATE("clickedAt") AS date,
          COUNT(*)::int     AS count
        FROM "ClickEvent"
        WHERE "shortLinkId" = ${link.id}
          AND "clickedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("clickedAt")
        ORDER BY date ASC
      `,
      this.prisma.clickEvent.findFirst({
        where: { shortLinkId: link.id },
        orderBy: { clickedAt: 'desc' },
        select: { clickedAt: true },
      }),
    ]);

    return {
      totalClicks,
      clicksByDay: clicksByDayRaw.map((r) => ({
        date: r.date.toISOString().split('T')[0],
        count: r.count,
      })),
      lastClickedAt: lastClick?.clickedAt.toISOString() ?? null,
    };
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
    if (link.expiresAt !== null && link.expiresAt < new Date())
      throw new GoneException('Link has expired');
    await this.prisma.clickEvent.create({ data: { shortLinkId: link.id } });
    return link.targetUrl;
  }

  private buildExpiry(noExpiry?: boolean, expiresInDays?: number): Date | null {
    if (noExpiry) return null;
    const days = expiresInDays ?? 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private async validateNoSsrf(url: string): Promise<void> {
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return;
    }

    // Strip brackets from IPv6 literals in URLs (e.g. [::1])
    const bare =
      hostname.startsWith('[') && hostname.endsWith(']')
        ? hostname.slice(1, -1)
        : hostname;

    if (isIP(bare)) {
      if (this.isPrivateIp(bare)) {
        throw new BadRequestException(
          'targetUrl must not point to a private or loopback address',
        );
      }
      return;
    }

    // Hostname — resolve then check; fail open if DNS is unavailable
    try {
      const { address } = await lookup(bare);
      if (this.isPrivateIp(address)) {
        throw new BadRequestException(
          'targetUrl must not point to a private or loopback address',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
    }
  }

  private isPrivateIp(ip: string): boolean {
    if (ip === '::1' || ip === '::') return true;
    if (/^fe80:/i.test(ip)) return true;
    if (/^f[cd]/i.test(ip)) return true; // fc00::/7

    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;
    const [a, b] = parts;
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // Shared Address Space
    return false;
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
    link: {
      slug: string;
      targetUrl: string;
      expiresAt: Date | null;
      createdAt: Date;
    },
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
