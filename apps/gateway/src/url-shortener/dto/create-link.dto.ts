import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLinkDto {
  @IsUrl({}, { message: 'targetUrl must be a valid URL' })
  @ApiProperty({
    example: 'https://example.com/very-long-url',
    description: 'The URL to shorten',
  })
  targetUrl: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'my-link',
    description: 'Optional custom slug (3–50 alphanumeric/hyphen characters)',
    required: false,
  })
  slug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @ApiProperty({
    example: 30,
    description: 'Expiry in days (1–365, default 30)',
    required: false,
  })
  expiresInDays?: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Set to true to create a link that never expires',
    required: false,
  })
  noExpiry?: boolean;
}
