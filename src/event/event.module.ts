import { Module, forwardRef } from '@nestjs/common';
import { EventService } from './event.service';
import { Event } from 'src/entities/event.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from 'src/calendar/calendar.module';
import { EventController } from './event.controller';
import { UserModule } from 'src/user/user.module';
import { AvailabilityModule } from 'src/availability/availability.module';
import { GetEventModule } from 'src/get-event/get-event.module';
import { TypeEventModule } from 'src/type-event/type-event.module';

@Module({
  imports: [
    forwardRef(() => TypeOrmModule.forFeature([Event])),
    CalendarModule,
    UserModule,
    AvailabilityModule,
    GetEventModule,
    TypeEventModule,
  ],
  providers: [EventService],
  controllers: [EventController],
  exports: [EventService],
})
export class EventModule {}
