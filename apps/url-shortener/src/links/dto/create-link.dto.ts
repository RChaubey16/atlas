import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLinkDto {
  @IsUrl({}, { message: 'targetUrl must be a valid URL' })
  targetUrl: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'Slug must be 3–50 alphanumeric/hyphen characters',
  })
  @MinLength(3, { message: 'Slug must be 3–50 alphanumeric/hyphen characters' })
  @MaxLength(50, {
    message: 'Slug must be 3–50 alphanumeric/hyphen characters',
  })
  slug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;

  @IsOptional()
  @IsBoolean()
  noExpiry?: boolean;
}
