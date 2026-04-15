import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ description: 'The refresh token received from /auth/register or /auth/login' })
  refreshToken: string;
}
