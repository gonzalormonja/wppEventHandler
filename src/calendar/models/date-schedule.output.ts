import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ScheduleOutput } from '../../models/schedule.output';

export class DateScheduleOutput extends ScheduleOutput {
  @Expose()
  @ApiProperty()
  date: Date;
}
