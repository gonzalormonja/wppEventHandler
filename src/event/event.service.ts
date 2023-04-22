import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/entities/event.entity';
import { Repository } from 'typeorm';
import { CreateEventInput } from './models/create-event.input';
import { CalendarService } from 'src/calendar/calendar.service';
import { UpdateEvent } from './models/update-event.input';
import { UserService } from 'src/user/user.service';
import { AvailabilityService } from 'src/availability/availability.service';
import { DateTime } from 'luxon';
import { GetEventService } from 'src/get-event/get-event.service';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event) private readonly eventModel: Repository<Event>,
    private readonly calendarService: CalendarService,
    private readonly userService: UserService,
    private readonly availabilityService: AvailabilityService,
    private readonly getEventService: GetEventService,
  ) {}

  public async create({
    calendarId,
    userId,
    ...eventInput
  }: CreateEventInput): Promise<Event> {
    const calendar = await this.calendarService.getOne(calendarId);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');

    const user = await this.userService.getOne(userId);
    if (!user) throw new NotFoundException('error.CALENDAR_NOT_FOUND');

    const event = this.eventModel.create({
      ...eventInput,
      calendar,
      user,
    });

    const dateIsValid = await this.availabilityService.validateDate(
      DateTime.fromJSDate(event.startDateTime),
      DateTime.fromJSDate(event.endDateTime),
      event.calendar.id,
    );
    if (!dateIsValid)
      throw new BadRequestException('error.SCHEDULE_NOT_AVAILABLE');

    return this.eventModel.save(event);
  }
  public async update(
    eventId: string,
    eventInput: UpdateEvent,
  ): Promise<Event> {
    const event = await this.getEventService.getOne(eventId);
    if (!event) throw new NotFoundException('error.EVENT_NOT_FOUND');
    Object.assign(event, eventInput);
    return this.eventModel.save(event);
  }

  public async delete(eventId: string): Promise<void> {
    const event = await this.getEventService.getOne(eventId);
    if (!event) throw new NotFoundException('error.EVENT_NOT_FOUND');
    await this.eventModel.softRemove(event);
  }
}
