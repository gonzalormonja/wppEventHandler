import { Module, forwardRef } from '@nestjs/common';
import { EventService } from './event.service';
import { Event } from '../entities/event.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from '../calendar/calendar.module';
import { EventController } from './event.controller';
import { UserModule } from '../user/user.module';
import { AvailabilityModule } from '../availability/availability.module';
import { TypeEventModule } from '../type-event/type-event.module';

@Module({
  imports: [
    forwardRef(() => TypeOrmModule.forFeature([Event])),
    CalendarModule,
    UserModule,
    AvailabilityModule,
    TypeEventModule,
  ],
  providers: [EventService],
  controllers: [EventController],
  exports: [EventService],
})
export class EventModule {}
