import { ApiProperty } from '@nestjs/swagger';

export class ContentItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique content ID (uuid)',
  })
  id: string;

  @ApiProperty({ example: 'My First Post' })
  title: string;

  @ApiProperty({ example: 'This is the body text of my post.' })
  body: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'ID of the user who created this item (uuid)',
  })
  ownerId: string;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt: string;
}
