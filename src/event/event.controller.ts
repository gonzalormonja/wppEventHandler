import { Body, Controller, Post } from '@nestjs/common';
import { EventService } from './event.service';
import { ApiTags } from '@nestjs/swagger';
import { CreateEventInput } from './models/create-event.input';
import { EventOutput } from './models/event.output';

@ApiTags('Event')
@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  public async createEvent(
    @Body() eventInput: CreateEventInput,
  ): Promise<EventOutput> {
    return this.eventService.create(eventInput);
  }
}
