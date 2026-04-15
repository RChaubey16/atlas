import { ApiProperty } from '@nestjs/swagger';

export class BlogDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Getting Started with NestJS' })
  title: string;

  @ApiProperty({ example: 'NestJS is a progressive Node.js framework...' })
  body: string;

  @ApiProperty({ example: 'Jane Doe' })
  author: string;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt: string;
}
