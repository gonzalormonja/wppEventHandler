import { Module } from '@nestjs/common';
import { WppHandlerService } from './wpp-handler.service';
import { WppHandlerController } from './wpp-handler.controller';
import { CalendarModule } from 'src/calendar/calendar.module';
import { AvailabilityModule } from 'src/availability/availability.module';
import { EventModule } from 'src/event/event.module';
import { UserModule } from 'src/user/user.module';
import { AdminModule } from 'src/admin/admin.module';

@Module({
  imports: [
    CalendarModule,
    AvailabilityModule,
    EventModule,
    UserModule,
    AdminModule,
  ],
  providers: [WppHandlerService],
  controllers: [WppHandlerController],
})
export class WppHandlerModule {}
