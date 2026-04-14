import { ApiProperty } from '@nestjs/swagger';

export class FakeUserDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'https://i.pravatar.cc/150?img=1' })
  avatarUrl: string;
}
