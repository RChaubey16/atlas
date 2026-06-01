import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailPlaygroundService } from './email-playground.service';

describe('EmailPlaygroundService', () => {
  let service: EmailPlaygroundService;

  const mockTemplate = {
    id: 'tpl-1',
    userId: 'user-1',
    name: 'My Newsletter',
    description: 'Monthly update',
    blocksJson: [{ id: 'b1', type: 'heading', props: { text: 'Hello' } }],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    emailTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockEmail = { sendRaw: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailPlaygroundService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<EmailPlaygroundService>(EmailPlaygroundService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('persists a new template and returns it', async () => {
      mockPrisma.emailTemplate.create.mockResolvedValue(mockTemplate);

      const dto = {
        name: 'My Newsletter',
        description: 'Monthly update',
        blocks: [{ id: 'b1', type: 'heading', props: { text: 'Hello' } }],
      };
      const result = await service.create(dto, 'user-1');

      expect(mockPrisma.emailTemplate.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: dto.name,
          description: dto.description,
          blocksJson: dto.blocks,
        },
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('findAllByUser', () => {
    it('returns a summary list (no blocksJson) ordered by updatedAt desc', async () => {
      const summary = { id: 'tpl-1', name: 'My Newsletter', version: 1 };
      mockPrisma.emailTemplate.findMany.mockResolvedValue([summary]);

      const result = await service.findAllByUser('user-1');

      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { updatedAt: 'desc' },
        }),
      );
      expect(result).toEqual([summary]);
    });
  });

  describe('findOne', () => {
    it('returns the template when it belongs to the user', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      const result = await service.findOne('tpl-1', 'user-1');
      expect(result).toEqual(mockTemplate);
    });

    it('throws NotFoundException when template does not exist', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when template belongs to a different user', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      await expect(service.findOne('tpl-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('updates the template and increments version', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      const updated = { ...mockTemplate, name: 'New Name', version: 2 };
      mockPrisma.emailTemplate.update.mockResolvedValue(updated);

      const result = await service.update(
        'tpl-1',
        { name: 'New Name' },
        'user-1',
      );

      expect(mockPrisma.emailTemplate.update).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
        data: expect.objectContaining({
          name: 'New Name',
          version: { increment: 1 },
        }),
      });
      expect(result.version).toBe(2);
    });

    it('throws ForbiddenException when template belongs to a different user', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      await expect(
        service.update('tpl-1', { name: 'X' }, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.emailTemplate.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the template when it belongs to the user', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.emailTemplate.delete.mockResolvedValue(mockTemplate);

      await service.remove('tpl-1', 'user-1');

      expect(mockPrisma.emailTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
      });
    });

    it('throws ForbiddenException when template belongs to a different user', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      await expect(service.remove('tpl-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.emailTemplate.delete).not.toHaveBeenCalled();
    });
  });

  describe('render', () => {
    it('returns rendered HTML without persisting', () => {
      const result = service.render({
        blocks: [{ id: 'b1', type: 'heading', props: { text: 'Hello' } }],
        variables: {},
      });
      expect(result).toHaveProperty('html');
      expect(result.html).toContain('Hello');
      expect(result.html).toContain('<!DOCTYPE html>');
    });

    it('applies variable substitution during render', () => {
      const result = service.render({
        blocks: [
          { id: 'b1', type: 'paragraph', props: { text: 'Hi {{name}}' } },
        ],
        variables: { name: 'Dave' },
      });
      expect(result.html).toContain('Hi Dave');
    });
  });

  describe('sendTest', () => {
    it('renders blocks and sends a raw email prefixed with [Test]', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockEmail.sendRaw.mockResolvedValue(undefined);

      const result = await service.sendTest(
        { templateId: 'tpl-1', to: 'alice@example.com', variables: {} },
        'user-1',
      );

      expect(mockEmail.sendRaw).toHaveBeenCalledWith(
        'alice@example.com',
        '[Test] My Newsletter',
        expect.stringContaining('<!DOCTYPE html>'),
      );
      expect(result).toEqual({ sent: true });
    });

    it('throws InternalServerErrorException when Resend fails', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockEmail.sendRaw.mockRejectedValue(new Error('Resend down'));

      await expect(
        service.sendTest(
          { templateId: 'tpl-1', to: 'alice@example.com', variables: {} },
          'user-1',
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws ForbiddenException when template belongs to a different user', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);

      await expect(
        service.sendTest(
          { templateId: 'tpl-1', to: 'alice@example.com', variables: {} },
          'other-user',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockEmail.sendRaw).not.toHaveBeenCalled();
    });
  });
});
