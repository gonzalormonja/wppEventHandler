import { Module, forwardRef } from '@nestjs/common';
import { EventService } from './event.service';
import { Event } from 'src/entities/event.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from 'src/calendar/calendar.module';

@Module({
  imports: [
    forwardRef(() => TypeOrmModule.forFeature([Event])),
    CalendarModule,
  ],
  providers: [EventService],
})
export class EventModule {}
