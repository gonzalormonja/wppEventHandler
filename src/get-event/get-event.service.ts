import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Event } from 'src/entities/event.entity';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import * as uuid from 'uuid';

@Injectable()
export class GetEventService {
  constructor(
    @InjectRepository(Event) private readonly eventModel: Repository<Event>,
  ) {}

  public async get(calendarId: uuid, startDate: DateTime, endDate: DateTime) {
    return this.eventModel.findAndCount({
      where: {
        calendar: {
          id: calendarId,
        },
        endDateTime: MoreThanOrEqual(startDate.toJSDate()),
        startDateTime: LessThanOrEqual(endDate.toJSDate()),
      },
    });
  }

  public async getOne(id: string): Promise<Event> {
    return this.eventModel.findOne({
      where: {
        id,
      },
    });
  }
}
