import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';
import { WelcomeEmailTemplate } from './templates/welcome.template';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  const mockSendMail = jest.fn();

  beforeEach(async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call sendMail with the correct to, subject from the template', async () => {
    const template = new WelcomeEmailTemplate();

    await service.sendMail('user@example.com', template);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Welcome to Atlas!',
      }),
    );
  });

  it('should not throw when the SMTP transport fails', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));
    const template = new WelcomeEmailTemplate();

    await expect(service.sendMail('user@example.com', template)).resolves.not.toThrow();
  });
});
