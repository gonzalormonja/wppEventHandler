import { Module, forwardRef } from '@nestjs/common';
import { EventService } from './event.service';
import { Event } from 'src/entities/event.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarModule } from 'src/calendar/calendar.module';
import { EventController } from './event.controller';

@Module({
  imports: [
    forwardRef(() => TypeOrmModule.forFeature([Event])),
    CalendarModule,
  ],
  providers: [EventService],
  controllers: [EventController],
})
export class EventModule {}
