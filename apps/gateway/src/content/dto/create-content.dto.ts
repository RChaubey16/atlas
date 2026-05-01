import { ApiProperty } from '@nestjs/swagger';

export class CreateContentDto {
  @ApiProperty({
    example: 'My First Post',
    description: 'Title of the content item',
  })
  title: string;

  @ApiProperty({
    example: 'This is the body text of my post.',
    description: 'Body of the content item',
  })
  body: string;
}
