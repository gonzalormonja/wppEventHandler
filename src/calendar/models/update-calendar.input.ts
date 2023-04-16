import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { DayScheduleInput } from './day-schedule.input';
import { Transform, Type } from 'class-transformer';

export class UpdateCalendar {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name: string;
  @ApiPropertyOptional({ type: [DayScheduleInput] })
  @Type(() => DayScheduleInput)
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  daySchedules: DayScheduleInput[];
}
