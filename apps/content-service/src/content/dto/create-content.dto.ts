import { IsString, MinLength } from 'class-validator';

export class CreateContentDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  body: string;
}
