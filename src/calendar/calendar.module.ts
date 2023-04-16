import { Module, forwardRef } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Calendar } from 'src/entities/calendar.entity';

@Module({
  imports: [forwardRef(() => TypeOrmModule.forFeature([Calendar]))],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
