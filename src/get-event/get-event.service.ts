import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Event } from 'src/entities/event.entity';
import {
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import * as uuid from 'uuid';

@Injectable()
export class GetEventService {
  constructor(
    @InjectRepository(Event) private readonly eventModel: Repository<Event>,
  ) {}

  public async get(
    userId?: uuid,
    calendarId?: uuid,
    startDate?: DateTime,
    endDate?: DateTime,
  ) {
    let query: FindOptionsWhere<Event> = {
      user: {
        id: userId,
      },
    };
    if (calendarId)
      query = {
        ...query,
        calendar: {
          id: calendarId,
        },
      };
    if (startDate)
      query = {
        ...query,
        endDateTime: MoreThanOrEqual(startDate.toJSDate()),
      };
    if (endDate)
      query = {
        ...query,
        startDateTime: LessThanOrEqual(endDate.toJSDate()),
      };
    return this.eventModel.findAndCount({
      where: query,
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
