import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { UserTemplatesService } from './user-templates.service';

describe('UserTemplatesService', () => {
  let service: UserTemplatesService;

  const mockTemplate = {
    id: 'tpl-1',
    userId: 'user-1',
    name: 'Promo',
    subject: 'Special offer',
    html: '<h1>Hi</h1>',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    userTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTemplatesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserTemplatesService>(UserTemplatesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('calls prisma.create with userId and dto fields', async () => {
      mockPrisma.userTemplate.create.mockResolvedValue(mockTemplate);

      const dto = {
        name: 'Promo',
        subject: 'Special offer',
        html: '<h1>Hi</h1>',
      };
      const result = await service.create('user-1', dto);

      expect(mockPrisma.userTemplate.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', ...dto },
      });
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('findAllByUser', () => {
    it('returns templates for the user ordered newest first', async () => {
      mockPrisma.userTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.findAllByUser('user-1');

      expect(mockPrisma.userTemplate.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockTemplate]);
    });
  });

  describe('findOne', () => {
    it('returns the template when it belongs to the user', async () => {
      mockPrisma.userTemplate.findUnique.mockResolvedValue(mockTemplate);
      const result = await service.findOne('tpl-1', 'user-1');
      expect(result).toEqual(mockTemplate);
    });

    it('throws NotFoundException when template is not found', async () => {
      mockPrisma.userTemplate.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when template belongs to a different user', async () => {
      mockPrisma.userTemplate.findUnique.mockResolvedValue(mockTemplate);
      await expect(service.findOne('tpl-1', 'other-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('deletes the template when it belongs to the user', async () => {
      mockPrisma.userTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.userTemplate.delete.mockResolvedValue(mockTemplate);

      await service.delete('tpl-1', 'user-1');

      expect(mockPrisma.userTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
      });
    });

    it('throws NotFoundException when template is not found', async () => {
      mockPrisma.userTemplate.findUnique.mockResolvedValue(null);
      await expect(service.delete('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.userTemplate.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when template belongs to a different user', async () => {
      mockPrisma.userTemplate.findUnique.mockResolvedValue(mockTemplate);
      await expect(service.delete('tpl-1', 'other-user')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.userTemplate.delete).not.toHaveBeenCalled();
    });
  });
});
