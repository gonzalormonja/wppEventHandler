import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AvailabilityModule } from './availability/availability.module';
import { EventModule } from './event/event.module';
import { CalendarModule } from './calendar/calendar.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [AvailabilityModule, EventModule, CalendarModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
