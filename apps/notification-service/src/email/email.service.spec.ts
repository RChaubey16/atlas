import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { EmailService } from './email.service';
import { WelcomeEmailTemplate } from './templates/welcome.template';

const mockResendSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'RESEND_API_KEY') return 'test-api-key';
    throw new Error(`Missing required config: ${key}`);
  }),
  get: jest.fn((_key: string, defaultValue: string) => defaultValue),
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    mockResendSend.mockResolvedValue({ data: { id: 'test-id' }, error: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call resend.emails.send with the correct to and subject', async () => {
    const template = new WelcomeEmailTemplate();

    await service.sendMail('user@example.com', template);

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Welcome to Atlas!',
      }),
    );
  });

  it('should not throw when resend returns an error response', async () => {
    mockResendSend.mockResolvedValue({
      data: null,
      error: { message: 'API error', name: 'resend_error' },
    });
    const template = new WelcomeEmailTemplate();

    await expect(
      service.sendMail('user@example.com', template),
    ).resolves.not.toThrow();
  });
});
