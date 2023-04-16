import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UserInput {
  @ApiProperty()
  @IsString()
  wppId: string;
  @ApiProperty()
  @IsString()
  name: string;
}
