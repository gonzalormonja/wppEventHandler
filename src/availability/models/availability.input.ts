import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsUUID } from 'class-validator';
import { DateTime } from 'luxon';
import * as uuid from 'uuid';

export class AvailabilityInput {
  @ApiProperty({ type: String })
  @IsUUID('4')
  calendarId: uuid;

  @ApiProperty({ type: String })
  @IsUUID('4')
  typeEventId: uuid;

  @ApiProperty({ type: Date })
  @IsDate()
  @Transform(({ value }) =>
    value
      ? DateTime.fromJSDate(new Date(value)).startOf('day').toJSDate()
      : null,
  )
  date: Date;
}
