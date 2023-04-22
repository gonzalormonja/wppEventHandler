import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CalendarOutput } from 'src/calendar/models/calendar.output';
import { Status } from 'src/models/status.enum';
import { UserOutput } from 'src/user/models/user.output';

export class EventOutput {
  @Expose()
  @ApiProperty()
  description: string;
  @Expose()
  @ApiProperty()
  startDateTime: Date;
  @Expose()
  @ApiProperty()
  endDateTime: Date;
  @Expose()
  @ApiProperty({ enum: Status })
  status: Status;
  @Expose()
  @ApiProperty({ type: CalendarOutput })
  @Type(() => CalendarOutput)
  calendar: CalendarOutput;
  @Expose()
  @ApiProperty({ type: UserOutput })
  @Type(() => UserOutput)
  user: UserOutput;
}
