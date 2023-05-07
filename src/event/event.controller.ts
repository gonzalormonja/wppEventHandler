import { Body, Controller, Post, Req } from '@nestjs/common';
import { EventService } from './event.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateEventInput } from './models/create-event.input';
import { EventOutput } from './models/event.output';
import { DecodedToken as DecodedTokenInterface } from 'src/models/decodedToken.interface';

@ApiBearerAuth()
@ApiTags('Event')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  public async createEvent(
    @Body() eventInput: CreateEventInput,
    @Req() { admin }: DecodedTokenInterface,
  ): Promise<EventOutput> {
    return this.eventService.create(eventInput, admin);
  }
}
