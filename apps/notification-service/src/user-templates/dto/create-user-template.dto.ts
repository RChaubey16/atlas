import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUserTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @IsString()
  @IsNotEmpty()
  html: string;
}
