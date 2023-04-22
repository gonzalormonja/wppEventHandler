import { ApiProperty } from '@nestjs/swagger';
import { Max, Min } from 'class-validator';

export class DayScheduleInput {
  @ApiProperty({ minimum: 1, maximum: 7 })
  @Min(1)
  @Max(2)
  weekday: number;
  @ApiProperty()
  from: string;
  @ApiProperty()
  to: string;
}
