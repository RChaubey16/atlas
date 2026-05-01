import { UserCreatedEvent } from '@app/contracts';
import { Test, TestingModule } from '@nestjs/testing';

import { EmailService } from '../email/email.service';
import { TemplateRegistry } from '../email/template-registry';
import { WelcomeEmailTemplate } from '../email/templates/welcome.template';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  const mockEmailService = { sendMail: jest.fn() };
  const mockTemplateRegistry = {
    get: jest.fn().mockReturnValue(new WelcomeEmailTemplate()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: EmailService, useValue: mockEmailService },
        { provide: TemplateRegistry, useValue: mockTemplateRegistry },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUserCreated', () => {
    it('should call emailService.sendMail with the user email', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-123',
        email: 'newuser@example.com',
        createdAt: new Date(),
      };

      await service.handleUserCreated(event);

      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        'newuser@example.com',
        expect.objectContaining({ subject: 'Welcome to Atlas!' }),
        expect.objectContaining({ email: 'newuser@example.com' }),
      );
    });

    it('should call emailService.sendMail exactly once per event', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-456',
        email: 'another@example.com',
        createdAt: new Date(),
      };

      await service.handleUserCreated(event);

      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
    });
  });
});
