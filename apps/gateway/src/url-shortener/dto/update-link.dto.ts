import { ApiProperty } from '@nestjs/swagger';

export class UpdateLinkDto {
  @ApiProperty({
    example: 'https://example.com/new-url',
    description: 'New target URL',
    required: false,
  })
  targetUrl?: string;

  @ApiProperty({
    example: 60,
    description: 'New expiry in days (1–365)',
    required: false,
  })
  expiresInDays?: number;

  @ApiProperty({
    example: false,
    description: 'Set to true to remove expiry',
    required: false,
  })
  noExpiry?: boolean;
}
