import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from '../entities/event.entity';
import { Repository } from 'typeorm';
import { CreateEventInput } from './models/create-event.input';
import { CalendarService } from '../calendar/calendar.service';
import { UpdateEvent } from './models/update-event.input';
import { UserService } from '../user/user.service';
import { AvailabilityService } from '../availability/availability.service';
import { DateTime } from 'luxon';
import { TypeEventService } from '../type-event/type-event.service';
import { Admin } from 'src/entities/admin.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event) private readonly eventModel: Repository<Event>,
    private readonly calendarService: CalendarService,
    private readonly userService: UserService,
    private readonly availabilityService: AvailabilityService,
    private readonly typeEventService: TypeEventService,
  ) {}

  public async create(
    { calendarId, userId, typeEventId, ...eventInput }: CreateEventInput,
    admin: Admin,
  ): Promise<Event> {
    const calendar = await this.calendarService.getOne(calendarId, admin);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');

    const typeEvent = await this.typeEventService.getOne(typeEventId, admin);
    if (!typeEvent) throw new NotFoundException('error.TYPE_EVENT_NOT_FOUND');

    const user = await this.userService.getOne(userId, admin);
    if (!user) throw new NotFoundException('error.CALENDAR_NOT_FOUND');

    const event = this.eventModel.create({
      ...eventInput,
      calendar,
      user,
      admin,
    });

    const dateIsValid = await this.availabilityService.validateDate(
      DateTime.fromJSDate(event.startDateTime),
      DateTime.fromJSDate(event.endDateTime),
      event.calendar.id,
      typeEvent.id,
      admin,
    );
    if (!dateIsValid)
      throw new BadRequestException('error.SCHEDULE_NOT_AVAILABLE');

    return this.eventModel.save(event);
  }
  public async update(
    eventId: string,
    eventInput: UpdateEvent,
    admin: Admin,
  ): Promise<Event> {
    const event = await this.eventModel.findOne({
      where: {
        id: eventId,
        admin: { id: admin.id },
      },
    });
    if (!event) throw new NotFoundException('error.EVENT_NOT_FOUND');
    Object.assign(event, eventInput);
    return this.eventModel.save(event);
  }

  public async delete(eventId: string, admin: Admin): Promise<void> {
    const event = await this.eventModel.findOne({
      where: {
        id: eventId,
        admin: { id: admin.id },
      },
    });
    if (!event) throw new NotFoundException('error.EVENT_NOT_FOUND');
    await this.eventModel.softRemove(event);
  }
}
