import { IsEmail, IsOptional, IsString } from 'class-validator';

export class GoogleProfileDto {
  @IsString()
  googleId: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
}
