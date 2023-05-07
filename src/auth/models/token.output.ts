import { ApiProperty } from '@nestjs/swagger';

export class TokenOutput {
  @ApiProperty()
  accessToken: string;
  @ApiProperty()
  refreshToken: string;
  @ApiProperty()
  adminId: string;
}
