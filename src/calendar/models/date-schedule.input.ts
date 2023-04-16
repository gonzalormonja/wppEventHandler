import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate } from 'class-validator';

export class DateScheduleInput {
  @ApiProperty()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : null))
  date: Date;
  @ApiProperty()
  from: string;
  @ApiProperty()
  to: string;
}
