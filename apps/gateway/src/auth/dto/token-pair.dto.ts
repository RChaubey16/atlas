import { ApiProperty } from '@nestjs/swagger';

export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived JWT access token (expires in 15 minutes)' })
  accessToken: string;

  @ApiProperty({ description: 'Long-lived JWT refresh token (expires in 7 days)' })
  refreshToken: string;
}
