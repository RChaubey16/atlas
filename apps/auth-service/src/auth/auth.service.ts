import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleProfileDto } from './dto/google-profile.dto';
import { USER_CREATED_EVENT, UserCreatedEvent } from '@app/contracts';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
    });

    const event: UserCreatedEvent = {
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
    this.notificationClient.emit(USER_CREATED_EVENT, event);

    this.logger.log(`Registered user ${user.id} (${user.email})`);
    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      this.logger.warn(`Login failed: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn(`Login failed: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Login: ${user.id} (${user.email})`);
    return this.issueTokens(user.id, user.email);
  }

  async findOrCreateGoogleUser(dto: GoogleProfileDto): Promise<TokenPair> {
    let user = await this.prisma.user.findUnique({
      where: { googleId: dto.googleId },
    });

    if (!user) {
      // Link to existing email/password account if email matches
      user = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: dto.googleId },
        });
        this.logger.log(
          `Google linked to existing user ${user.id} (${user.email})`,
        );
      } else {
        user = await this.prisma.user.create({
          data: { email: dto.email, googleId: dto.googleId },
        });

        const event: UserCreatedEvent = {
          userId: user.id,
          email: user.email,
          createdAt: user.createdAt,
        };
        this.notificationClient.emit(USER_CREATED_EVENT, event);
        this.logger.log(
          `Google registered new user ${user.id} (${user.email})`,
        );
      }
    }

    return this.issueTokens(user.id, user.email);
  }

  refresh(refreshToken: string): TokenPair {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        refreshToken,
        { secret: this.refreshSecret },
      );
      this.logger.log(`Token refreshed: ${payload.sub}`);
      return this.issueTokens(payload.sub, payload.email);
    } catch {
      this.logger.warn(
        'Token refresh failed: invalid or expired refresh token',
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private issueTokens(userId: string, email: string): TokenPair {
    const payload = { sub: userId, email };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: 60 * 15,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: 60 * 60 * 24 * 7,
    });
    return { accessToken, refreshToken };
  }
}
