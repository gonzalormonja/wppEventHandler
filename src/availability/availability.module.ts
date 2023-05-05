import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CalendarModule } from 'src/calendar/calendar.module';
import { AvailabilityController } from './availability.controller';
import { GetEventModule } from 'src/get-event/get-event.module';
import { TypeEventModule } from 'src/type-event/type-event.module';

@Module({
  imports: [CalendarModule, GetEventModule, TypeEventModule],
  providers: [AvailabilityService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
