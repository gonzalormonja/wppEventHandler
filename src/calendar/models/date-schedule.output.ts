import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import convertMinuteToHour from 'src/utils/convert-minute-to-hour';

export class DateScheduleOutput {
  @Expose()
  @ApiProperty()
  date: Date;
  @Expose()
  @ApiProperty({ type: String })
  @Transform(({ value }) => convertMinuteToHour(value))
  from: number;
  @Expose()
  @ApiProperty({ type: String })
  @Transform(({ value }) => convertMinuteToHour(value))
  to: number;
}
