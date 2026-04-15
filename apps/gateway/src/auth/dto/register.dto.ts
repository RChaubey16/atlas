import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password — minimum 8 characters',
    minLength: 8,
  })
  password: string;
}
