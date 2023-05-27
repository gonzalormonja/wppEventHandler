import { Module } from '@nestjs/common';
import { WppHandlerService } from './wpp-handler.service';
import { WppHandlerController } from './wpp-handler.controller';
import { CalendarModule } from '../calendar/calendar.module';
import { AvailabilityModule } from '../availability/availability.module';
import { EventModule } from '../event/event.module';
import { UserModule } from '../user/user.module';
import { AdminModule } from '../admin/admin.module';
import { TypeEventModule } from '../type-event/type-event.module';
import { GetEventModule } from '../get-event/get-event.module';
import { WppHandlerFoodService } from './wpp-handler-food.service';

@Module({
  imports: [
    CalendarModule,
    AvailabilityModule,
    EventModule,
    UserModule,
    AdminModule,
    TypeEventModule,
    GetEventModule,
    AdminModule,
  ],
  providers: [WppHandlerService, WppHandlerFoodService, WppHandlerController],
  controllers: [WppHandlerController],
})
export class WppHandlerModule {
  constructor(private readonly wppHandlerController: WppHandlerController) {
    // this.wppHandlerController.startWpp();
  }
}
