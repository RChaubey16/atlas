import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description:
      'The refresh token received from /auth/register or /auth/login',
  })
  @IsString()
  refreshToken: string;
}
