import { Module, forwardRef } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Calendar } from '../entities/calendar.entity';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [forwardRef(() => TypeOrmModule.forFeature([Calendar]))],
  providers: [CalendarService],
  exports: [CalendarService],
  controllers: [CalendarController],
})
export class CalendarModule {}
