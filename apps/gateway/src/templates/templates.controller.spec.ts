import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from './templates.controller';

// Mock the contracts library so tests don't depend on build state
jest.mock('@app/contracts', () => ({
  TEMPLATES: {
    welcome: {
      id: 'welcome',
      name: 'Welcome',
      description: 'Sent on registration.',
      subject: 'Welcome to Atlas!',
      fields: [{ name: 'email', required: true }],
      previewData: { email: 'preview@example.com' },
      html: (data: Record<string, string>) => `<p>Hi ${data.email}</p>`,
    },
    'password-reset': {
      id: 'password-reset',
      name: 'Password Reset',
      description: 'Reset password email.',
      subject: 'Reset your password',
      fields: [{ name: 'resetLink', required: true }],
      previewData: { email: 'preview@example.com', resetLink: 'https://example.com/reset' },
      html: (data: Record<string, string>) => `<a href="${data.resetLink}">Reset</a>`,
    },
  },
}));

describe('TemplatesController', () => {
  let controller: TemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
  });

  describe('list', () => {
    it('returns all templates without the html function or previewData', () => {
      const result = controller.list();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('subject');
      expect(result[0]).toHaveProperty('fields');
      expect(result[0]).not.toHaveProperty('html');
      expect(result[0]).not.toHaveProperty('previewData');
    });

    it('includes the welcome template in the list', () => {
      const result = controller.list();
      expect(result.some((t) => t.id === 'welcome')).toBe(true);
    });
  });

  describe('preview', () => {
    it('returns id, subject, and rendered html for a known template', () => {
      const result = controller.preview('welcome');
      expect(result).toEqual({
        id: 'welcome',
        subject: 'Welcome to Atlas!',
        html: expect.stringContaining('preview@example.com'),
      });
    });

    it('throws NotFoundException for an unknown template id', () => {
      expect(() => controller.preview('nonexistent')).toThrow(NotFoundException);
    });
  });
});
