import { Test, TestingModule } from '@nestjs/testing';

import { AuthProxyController } from './auth-proxy.controller';
import { AuthProxyService } from './auth-proxy.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthProxyController', () => {
  let controller: AuthProxyController;
  let service: AuthProxyService;

  const mockTokenPair = { accessToken: 'access.token', refreshToken: 'refresh.token' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthProxyController],
      providers: [
        {
          provide: AuthProxyService,
          useValue: {
            register: jest.fn().mockResolvedValue(mockTokenPair),
            login: jest.fn().mockResolvedValue(mockTokenPair),
            refresh: jest.fn().mockResolvedValue(mockTokenPair),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthProxyController>(AuthProxyController);
    service = module.get<AuthProxyService>(AuthProxyService);
  });

  describe('register', () => {
    it('should call authProxy.register with the dto and return the result', async () => {
      const dto: RegisterDto = { email: 'test@example.com', password: 'password123' };
      const result = await controller.register(dto);
      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTokenPair);
    });
  });

  describe('login', () => {
    it('should call authProxy.login with the dto and return the result', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'password123' };
      const result = await controller.login(dto);
      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTokenPair);
    });
  });

  describe('refresh', () => {
    it('should call authProxy.refresh with the dto and return the result', async () => {
      const dto: RefreshDto = { refreshToken: 'some.refresh.token' };
      const result = await controller.refresh(dto);
      expect(service.refresh).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTokenPair);
    });
  });
});
