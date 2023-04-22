import { Module, forwardRef } from '@nestjs/common';
import { GetEventController } from './get-event.controller';
import { GetEventService } from './get-event.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from 'src/entities/event.entity';

@Module({
  imports: [forwardRef(() => TypeOrmModule.forFeature([Event]))],
  controllers: [GetEventController],
  providers: [GetEventService],
  exports: [GetEventService],
})
export class GetEventModule {}
