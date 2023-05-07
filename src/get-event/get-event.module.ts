import { Module, forwardRef } from '@nestjs/common';
import { GetEventService } from './get-event.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';

@Module({
  imports: [forwardRef(() => TypeOrmModule.forFeature([Event]))],
  providers: [GetEventService],
  exports: [GetEventService],
})
export class GetEventModule {}
