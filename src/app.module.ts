import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AvailabilityModule } from './availability/availability.module';
import { EventModule } from './event/event.module';
import { CalendarModule } from './calendar/calendar.module';
import { UserModule } from './user/user.module';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { WppHandlerModule } from './wpp-handler/wpp-handler.module';
import options from './config/orm';

@Module({
  imports: [
    AvailabilityModule,
    EventModule,
    CalendarModule,
    UserModule,
    TypeOrmModule.forRoot(options as TypeOrmModuleOptions),
    WppHandlerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
