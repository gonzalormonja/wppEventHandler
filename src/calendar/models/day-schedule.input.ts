import { ApiProperty } from '@nestjs/swagger';

export class DayScheduleInput {
  @ApiProperty()
  weekday: number;
  @ApiProperty()
  from: string;
  @ApiProperty()
  to: string;
}
