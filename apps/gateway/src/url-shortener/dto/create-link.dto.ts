import { ApiProperty } from '@nestjs/swagger';

export class CreateLinkDto {
  @ApiProperty({
    example: 'https://example.com/very-long-url',
    description: 'The URL to shorten',
  })
  targetUrl: string;

  @ApiProperty({
    example: 'my-link',
    description: 'Optional custom slug (3–50 alphanumeric/hyphen characters)',
    required: false,
  })
  slug?: string;

  @ApiProperty({
    example: 30,
    description: 'Expiry in days (1–365, default 30)',
    required: false,
  })
  expiresInDays?: number;

  @ApiProperty({
    example: false,
    description: 'Set to true to create a link that never expires',
    required: false,
  })
  noExpiry?: boolean;
}
