import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ScheduleOutput } from '../../models/schedule.output';

export class AvailabilityOutput {
  @Expose()
  @ApiProperty({ type: [ScheduleOutput] })
  @Type(() => ScheduleOutput)
  schedules: ScheduleOutput[];
}
