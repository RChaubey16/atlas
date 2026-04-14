import { ApiProperty } from '@nestjs/swagger';

export class ContentItemDto {
  @ApiProperty({ example: 'clxyz123abc', description: 'Unique content ID (cuid)' })
  id: string;

  @ApiProperty({ example: 'My First Post' })
  title: string;

  @ApiProperty({ example: 'This is the body text of my post.' })
  body: string;

  @ApiProperty({ example: 'cluser456def', description: 'ID of the user who created this item' })
  ownerId: string;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt: string;
}
