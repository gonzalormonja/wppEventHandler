import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CalendarModule } from 'src/calendar/calendar.module';
import { AvailabilityController } from './availability.controller';
import { GetEventModule } from 'src/get-event/get-event.module';

@Module({
  imports: [CalendarModule, GetEventModule],
  providers: [AvailabilityService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
