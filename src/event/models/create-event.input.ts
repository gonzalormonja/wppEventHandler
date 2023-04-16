import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

export class CreateEvent {
  @ApiProperty()
  @IsString()
  description: string;
  @ApiProperty()
  @Transform(({ value }) => (value ? new Date(value) : null))
  @IsDate()
  dateTime: Date;
  @ApiProperty()
  @IsString()
  calendarId: string;
}
