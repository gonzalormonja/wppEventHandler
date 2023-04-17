import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { DateScheduleOutput } from './date-schedule.output';
import { DayScheduleOutput } from './day-schedule.output';

export class CalendarOutput {
  @Expose()
  @ApiProperty()
  name: string;
  @Expose()
  @ApiProperty({ type: [DateScheduleOutput] })
  @Type(() => DateScheduleOutput)
  dateSchedules: DateScheduleOutput[];
  @Expose()
  @ApiProperty({ type: [DayScheduleOutput] })
  @Type(() => DayScheduleOutput)
  daySchedules: DayScheduleOutput[];
}
