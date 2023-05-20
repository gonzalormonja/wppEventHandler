import { Module, ValidationPipe } from '@nestjs/common';
import { AvailabilityModule } from './availability/availability.module';
import { EventModule } from './event/event.module';
import { CalendarModule } from './calendar/calendar.module';
import { UserModule } from './user/user.module';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { WppHandlerModule } from './wpp-handler/wpp-handler.module';
import options from './config/orm';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { GetEventModule } from './get-event/get-event.module';
import { AdminModule } from './admin/admin.module';
import { TypeEventModule } from './type-event/type-event.module';
import { AuthModule } from './auth/auth.module';
import { AccessTokenGuard } from './interceptors/guards/accessToken.guard';
import { AccessTokenStrategy } from './auth/strategies/accessToken.strategy';
import { RefreshTokenStrategy } from './auth/strategies/refreshToken.strategy';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';

@Module({
  imports: [
    PassportModule.register({
      property: 'admin',
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'es-*': 'es',
        'en-*': 'en',
      },
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
      ],
    }),
    AvailabilityModule,
    EventModule,
    CalendarModule,
    UserModule,
    TypeOrmModule.forRoot(options as TypeOrmModuleOptions),
    GetEventModule,
    WppHandlerModule,
    AdminModule,
    TypeEventModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
      }),
    },
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    AccessTokenStrategy,
    RefreshTokenStrategy,
    JwtService,
  ],
  controllers: [AppController],
})
export class AppModule {}
