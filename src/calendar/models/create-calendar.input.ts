import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { DayScheduleInput } from './day-schedule.input';
import { Transform, Type } from 'class-transformer';

export class CreateCalendar {
  @ApiProperty()
  @IsString()
  name: string;
  @ApiProperty({ type: [DayScheduleInput] })
  @Type(() => DayScheduleInput)
  @IsArray()
  daySchedules: DayScheduleInput[];
}
