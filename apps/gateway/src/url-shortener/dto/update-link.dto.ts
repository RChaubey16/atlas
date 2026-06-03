import { IsBoolean, IsInt, IsOptional, IsUrl, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLinkDto {
  @IsOptional()
  @IsUrl({}, { message: 'targetUrl must be a valid URL' })
  @ApiProperty({
    example: 'https://example.com/new-url',
    description: 'New target URL',
    required: false,
  })
  targetUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @ApiProperty({
    example: 60,
    description: 'New expiry in days (1–365)',
    required: false,
  })
  expiresInDays?: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Set to true to remove expiry',
    required: false,
  })
  noExpiry?: boolean;
}
