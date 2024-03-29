import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { Event } from '../entities/event.entity';
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
    adminId: uuid,
    userId?: uuid,
    calendarId?: uuid,
    startDate?: DateTime,
    endDate?: DateTime,
  ) {
    let query: FindOptionsWhere<Event> = {
      admin: {
        id: adminId,
      },
    };
    if (userId) {
      query = {
        ...query,
        user: {
          id: userId,
        },
      };
    }
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
      order: {
        startDateTime: 'ASC',
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
