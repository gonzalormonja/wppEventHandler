import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CalendarModule } from 'src/calendar/calendar.module';

@Module({
  imports: [CalendarModule],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
