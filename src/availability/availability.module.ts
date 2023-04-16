import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Module({
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
