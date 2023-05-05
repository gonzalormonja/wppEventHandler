import { Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityInput } from './models/availability.input';
import { AvailabilityOutput } from './models/availability.output';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { DateTime } from 'luxon';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @Serialize(AvailabilityOutput)
  @ApiResponse({ status: 200, type: AvailabilityOutput })
  public async getAvailability(
    @Query() { calendarId, date, typeEventId }: AvailabilityInput,
  ): Promise<AvailabilityOutput> {
    return this.availabilityService.getAvailability(
      calendarId,
      DateTime.fromJSDate(date),
      typeEventId,
    );
  }
}
