import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ScheduleOutput } from '../../models/schedule.output';

export class DayScheduleOutput extends ScheduleOutput {
  @Expose()
  @ApiProperty()
  weekday: number;
}
