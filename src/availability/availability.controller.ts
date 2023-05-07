import { Controller, Get, Query, Req } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityInput } from './models/availability.input';
import { AvailabilityOutput } from './models/availability.output';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Serialize } from '../interceptors/serialize.interceptor';
import { DateTime } from 'luxon';
import { DecodedToken as DecodedTokenInterface } from 'src/models/decodedToken.interface';

@ApiTags('Availability')
@Controller('availability')
@ApiBearerAuth()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @Serialize(AvailabilityOutput)
  @ApiResponse({ status: 200, type: AvailabilityOutput })
  public async getAvailability(
    @Query() { calendarId, date, typeEventId }: AvailabilityInput,
    @Req() { admin }: DecodedTokenInterface,
  ): Promise<AvailabilityOutput> {
    return this.availabilityService.getAvailability(
      calendarId,
      DateTime.fromJSDate(date),
      typeEventId,
      admin,
    );
  }
}
