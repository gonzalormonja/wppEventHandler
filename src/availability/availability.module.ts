import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CalendarModule } from '../calendar/calendar.module';
import { AvailabilityController } from './availability.controller';
import { GetEventModule } from '../get-event/get-event.module';
import { TypeEventModule } from '../type-event/type-event.module';

@Module({
  imports: [CalendarModule, GetEventModule, TypeEventModule],
  providers: [AvailabilityService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
