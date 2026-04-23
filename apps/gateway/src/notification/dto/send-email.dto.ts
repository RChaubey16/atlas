import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsString } from 'class-validator';

export class SendEmailDto {
  @IsString()
  @ApiProperty({ example: 'password-reset', description: 'Template ID to use' })
  templateId: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ example: ['alice@example.com'], description: 'Recipient email addresses' })
  to: string[];

  @IsObject()
  @ApiPropertyOptional({
    example: { resetLink: 'https://app.example.com/reset?token=abc123' },
    description: 'Data passed to the template',
  })
  templateData: Record<string, unknown>;
}
