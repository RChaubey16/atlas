import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { RenderTemplateDto } from './dto/render-template.dto';
import { SendTestDto } from './dto/send-test.dto';
import { Block, renderBlocksToHtml } from './renderer/blocks-renderer';

@Injectable()
export class EmailPlaygroundService {
  private readonly logger = new Logger(EmailPlaygroundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateEmailTemplateDto, userId: string) {
    const template = await this.prisma.emailTemplate.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? '',
        blocksJson: dto.blocks as object[],
      },
    });
    this.logger.log(
      `[EmailPlayground] Created template ${template.id} for user ${userId}`,
    );
    return template;
  }

  async findAllByUser(userId: string) {
    return this.prisma.emailTemplate.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string, userId: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Template not found');
    if (template.userId !== userId) throw new ForbiddenException();
    return template;
  }

  async update(id: string, dto: UpdateEmailTemplateDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.blocks !== undefined && { blocksJson: dto.blocks as object[] }),
        version: { increment: 1 },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.emailTemplate.delete({ where: { id } });
  }

  render(dto: RenderTemplateDto): { html: string } {
    const html = renderBlocksToHtml(dto.blocks as Block[], dto.variables ?? {});
    return { html };
  }

  async sendTest(dto: SendTestDto, userId: string): Promise<{ sent: boolean }> {
    const template = await this.findOne(dto.templateId, userId);
    const blocks = (template.blocksJson as unknown as Block[]) ?? [];
    const html = renderBlocksToHtml(blocks, dto.variables ?? {});

    try {
      await this.email.sendRaw(dto.to, `[Test] ${template.name}`, html);
    } catch (err) {
      this.logger.error(
        `[EmailPlayground] Send test failed for ${dto.to}:`,
        err,
      );
      throw new InternalServerErrorException('Failed to send test email');
    }

    this.logger.log(
      `[EmailPlayground] Sent test email to ${dto.to} (template: ${template.id})`,
    );
    return { sent: true };
  }
}
