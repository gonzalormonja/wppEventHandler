import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CalendarOutput } from './calendar.output';

export class CalendarsOutput {
  @Expose()
  @ApiProperty({ type: [CalendarOutput] })
  @Type(() => CalendarOutput)
  records: CalendarOutput;
  @ApiProperty()
  @Expose()
  totalRecords: number;
}
