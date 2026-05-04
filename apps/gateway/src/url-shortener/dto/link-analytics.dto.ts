import { ApiProperty } from '@nestjs/swagger';

export class LinkAnalyticsDto {
  @ApiProperty({ example: 'my-link' })
  slug: string;

  @ApiProperty({ example: 'https://example.com/very-long-url' })
  targetUrl: string;

  @ApiProperty({ example: 42, description: 'Total click count' })
  totalClicks: number;

  @ApiProperty({
    example: [{ date: '2026-05-01', clicks: 10 }],
    description: 'Per-day click breakdown',
  })
  clicksByDay: { date: string; clicks: number }[];
}
