import { Expose, Type } from 'class-transformer';
import { CalendarOutput } from 'src/calendar/models/calendar.output';
import { UserOutput } from 'src/user/models/user.output';
import { Status } from 'whatsapp-web.js';

export class EventOutput {
  @Expose()
  description: string;
  @Expose()
  dateTime: string;
  @Expose()
  status: Status;
  @Expose()
  @Type(() => CalendarOutput)
  calendar: CalendarOutput;
  @Expose()
  @Type(() => UserOutput)
  user: UserOutput;
}
