import { Module, forwardRef } from '@nestjs/common';
import { TypeEventService } from './type-event.service';
import { TypeEventController } from './type-event.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeEvent } from 'src/entities/type-event.entity';

@Module({
  imports: [forwardRef(() => TypeOrmModule.forFeature([TypeEvent]))],
  providers: [TypeEventService],
  controllers: [TypeEventController],
})
export class TypeEventModule {}
