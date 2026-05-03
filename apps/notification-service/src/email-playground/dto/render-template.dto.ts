import { IsArray, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BlockDto } from './create-email-template.dto';

export class RenderTemplateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks: BlockDto[];

  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;
}
