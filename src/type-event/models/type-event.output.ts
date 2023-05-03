import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TypeEventOutput {
  @ApiProperty()
  @Expose()
  name: string;
  @ApiProperty()
  @Expose()
  durationInMinutes: number;
}
