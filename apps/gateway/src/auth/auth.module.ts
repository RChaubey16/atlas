import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthProxyController } from './auth-proxy.controller';
import { AuthProxyService } from './auth-proxy.service';

@Module({
  imports: [PassportModule, HttpModule],
  controllers: [AuthProxyController],
  providers: [JwtStrategy, AuthProxyService],
})
export class AuthModule {}
