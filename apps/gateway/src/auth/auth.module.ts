import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuthProxyController } from './auth-proxy.controller';
import { AuthProxyService } from './auth-proxy.service';

@Module({
  imports: [PassportModule, HttpModule],
  controllers: [AuthProxyController],
  providers: [JwtStrategy, GoogleStrategy, AuthProxyService],
})
export class AuthModule {}
