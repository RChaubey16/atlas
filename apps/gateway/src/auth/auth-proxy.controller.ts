import { Controller, Post, Body } from '@nestjs/common';
import { AuthProxyService } from './auth-proxy.service';

@Controller('auth')
export class AuthProxyController {
  constructor(private readonly authProxy: AuthProxyService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.authProxy.register(body);
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.authProxy.login(body);
  }

  @Post('refresh')
  refresh(@Body() body: unknown) {
    return this.authProxy.refresh(body);
  }
}
