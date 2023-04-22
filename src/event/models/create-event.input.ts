import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsString, IsUUID } from 'class-validator';
import * as uuid from 'uuid';

export class CreateEventInput {
  @ApiProperty()
  @IsString()
  description: string;
  @ApiProperty({ type: String })
  @IsUUID('4')
  userId: uuid;
  @ApiProperty()
  @Transform(({ value }) => (value ? new Date(value) : null))
  @IsDate()
  startDateTime: Date;
  @ApiProperty()
  @Transform(({ value }) => (value ? new Date(value) : null))
  @IsDate()
  endDateTime: Date;
  @ApiProperty({ type: String })
  @IsUUID('4')
  calendarId: uuid;
}
