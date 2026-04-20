import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { AuthProxyService } from './auth-proxy.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleProfile } from './strategies/google.strategy';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenPairDto } from './dto/token-pair.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthProxyController {
  constructor(private readonly authProxy: AuthProxyService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Access and refresh tokens', type: TokenPairDto })
  @ApiResponse({ status: 400, description: 'Validation error (invalid email or short password)' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authProxy.register(dto);
  }

  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 201, description: 'Access and refresh tokens', type: TokenPairDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authProxy.login(dto);
  }

  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiResponse({ status: 201, description: 'New access and refresh tokens', type: TokenPairDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authProxy.refresh(dto);
  }

  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google consent screen' })
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {
    // Passport redirects to Google — no body needed
  }

  @ApiOperation({ summary: 'Google OAuth callback — returns token pair' })
  @ApiResponse({ status: 200, description: 'Access and refresh tokens', type: TokenPairDto })
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authProxy.googleProfile(req.user as GoogleProfile);
    res.json(tokens);
  }
}
