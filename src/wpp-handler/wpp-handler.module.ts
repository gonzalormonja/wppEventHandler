import { Module } from '@nestjs/common';
import { WppHandlerService } from './wpp-handler.service';
import { WppHandlerController } from './wpp-handler.controller';

@Module({
  providers: [WppHandlerService],
  controllers: [WppHandlerController],
})
export class WppHandlerModule {}
