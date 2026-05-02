import { IsBoolean, IsInt, IsOptional, IsUrl, Max, Min } from 'class-validator';

export class UpdateLinkDto {
  @IsOptional()
  @IsUrl({}, { message: 'targetUrl must be a valid URL' })
  targetUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;

  @IsOptional()
  @IsBoolean()
  noExpiry?: boolean;
}
