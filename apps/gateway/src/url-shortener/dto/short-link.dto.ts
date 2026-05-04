import { ApiProperty } from '@nestjs/swagger';

export class ShortLinkDto {
  @ApiProperty({ example: 'clx1234abcd', description: 'cuid primary key' })
  id: string;

  @ApiProperty({ example: 'my-link', description: 'Unique slug' })
  slug: string;

  @ApiProperty({ example: 'https://example.com/very-long-url' })
  targetUrl: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z', nullable: true })
  expiresAt: string | null;

  @ApiProperty({ example: '2026-05-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: 42, description: 'Total click count' })
  clickCount: number;
}
