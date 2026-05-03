import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SendTestDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsEmail()
  to: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;
}
