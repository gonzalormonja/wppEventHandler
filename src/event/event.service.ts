import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from 'src/entities/event.entity';
import { Repository } from 'typeorm';
import { CreateEvent } from './models/create-event.input';
import { CalendarService } from 'src/calendar/calendar.service';
import { User } from 'src/entities/user.entity';
import { UpdateEvent } from './models/update-event.input';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event) private readonly eventModel: Repository<Event>,
    private readonly calendarService: CalendarService,
  ) {}

  public async create(
    { calendarId, ...eventInput }: CreateEvent,
    user: User,
  ): Promise<Event> {
    const calendar = await this.calendarService.getOne(calendarId);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');

    const event = this.eventModel.create({
      ...eventInput,
      user,
    });

    return this.eventModel.save(event);
  }
  public async update(
    eventId: string,
    eventInput: UpdateEvent,
  ): Promise<Event> {
    const event = await this.getOne(eventId);
    if (!event) throw new NotFoundException('error.EVENT_NOT_FOUND');
    Object.assign(event, eventInput);
    return this.eventModel.save(event);
  }

  public async delete(eventId: string): Promise<void> {
    const event = await this.getOne(eventId);
    if (!event) throw new NotFoundException('error.EVENT_NOT_FOUND');
    await this.eventModel.softRemove(event);
  }

  public async get() {
    return this.eventModel.findAndCount();
  }

  public async getOne(id: string): Promise<Event> {
    return this.eventModel.findOne({
      where: {
        id,
      },
    });
  }
}
