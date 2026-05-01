import { ApiProperty } from '@nestjs/swagger';

export class TemplateFieldDto {
  @ApiProperty({ example: 'email' })
  name: string;

  @ApiProperty({ example: true })
  required: boolean;

  @ApiProperty({ example: 'Recipient email address' })
  description: string;
}

export class TemplateListItemDto {
  @ApiProperty({ example: 'welcome' })
  id: string;

  @ApiProperty({ example: 'Welcome' })
  name: string;

  @ApiProperty({ example: 'Sent to new users after successful registration.' })
  description: string;

  @ApiProperty({ example: 'Welcome to Atlas!' })
  subject: string;

  @ApiProperty({ type: [TemplateFieldDto] })
  fields: TemplateFieldDto[];
}

export class TemplatePreviewDto {
  @ApiProperty({ example: 'welcome' })
  id: string;

  @ApiProperty({ example: 'Welcome to Atlas!' })
  subject: string;

  @ApiProperty({ description: 'Rendered HTML using preview data' })
  html: string;
}
