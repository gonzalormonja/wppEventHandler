import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Calendar } from '../entities/calendar.entity';
import { Not, Repository } from 'typeorm';
import { CreateCalendar } from './models/create-calendar.input';
import { DayScheduleInput } from './models/day-schedule.input';
import { DaySchedule } from '../entities/day-schedule.entity';
import { UpdateCalendar } from './models/update-calendar.input';
import { DateScheduleInput } from './models/date-schedule.input';
import { DateSchedule } from '../entities/date-schedule.entity';
import convertHourToMinute from '../utils/convert-hour-to-minute';
import * as uuid from 'uuid';
import { Admin } from 'src/entities/admin.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Calendar)
    private readonly calendarModel: Repository<Calendar>,
  ) {}

  public async create({ daySchedules, name }: CreateCalendar, admin: Admin) {
    const calendar = this.calendarModel.create({ id: uuid.v4(), name, admin });

    if (daySchedules)
      calendar.daySchedules = daySchedules.map((day) =>
        this.parseDaySchedule(day),
      );

    await this.validate(calendar);
    return this.calendarModel.save(calendar);
  }

  private parseDaySchedule(daySchedule: DayScheduleInput): DaySchedule {
    return {
      id: uuid.v4(),
      weekday: daySchedule.weekday,
      from: convertHourToMinute(daySchedule.from),
      to: convertHourToMinute(daySchedule.to),
    };
  }

  private parseDateSchedule(dateSchedule: DateScheduleInput): DateSchedule {
    return {
      id: uuid.v4(),
      date: dateSchedule.date,
      from: convertHourToMinute(dateSchedule.from),
      to: convertHourToMinute(dateSchedule.to),
    };
  }

  public async update(
    id: string,
    { daySchedules, ...calendarInput }: UpdateCalendar,
    admin: Admin,
  ): Promise<Calendar> {
    const calendar = await this.getOne(id, admin);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
    Object.assign(calendar, calendarInput);
    if (daySchedules && daySchedules.length > 0)
      calendar.daySchedules = daySchedules.map((day) =>
        this.parseDaySchedule(day),
      );
    await this.validate(calendar);
    return this.calendarModel.save(calendar);
  }

  public async addDate(
    calendarId: string,
    dateScheduleInput: DateScheduleInput,
    admin: Admin,
  ): Promise<Calendar> {
    const calendar = await this.getOne(calendarId, admin);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
    const dateSchedule = this.parseDateSchedule(dateScheduleInput);
    calendar.dateSchedules = [...calendar.dateSchedules, dateSchedule];
    return this.calendarModel.save(calendar);
  }

  public async removeDate(
    calendarId: string,
    dateScheduleId: string,
    admin: Admin,
  ): Promise<Calendar> {
    const calendar = await this.getOne(calendarId, admin);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
    calendar.dateSchedules = calendar.dateSchedules.filter(
      (date) => date.id != dateScheduleId,
    );
    return this.calendarModel.save(calendar);
  }

  public async delete(id: string, admin: Admin): Promise<void> {
    const calendar = await this.getOne(id, admin);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
    await this.calendarModel.softRemove(calendar);
  }

  public async get(admin: Admin): Promise<[Calendar[], number]> {
    return this.calendarModel.findAndCount({
      where: { admin: { id: admin.id } },
      relations: ['dateSchedules', 'daySchedules'],
      order: {
        daySchedules: {
          from: 'ASC',
        },
      },
    });
  }

  public async getOne(id: string, admin: Admin): Promise<Calendar> {
    if (!id) return;
    return this.calendarModel.findOne({
      relations: ['dateSchedules', 'daySchedules'],
      where: { id, admin: { id: admin.id } },
    });
  }

  public async getOneBy(
    column: string,
    value: string,
    admin: Admin,
  ): Promise<Calendar> {
    return this.calendarModel.findOne({
      relations: ['dateSchedules', 'daySchedules'],
      where: { [column]: value, admin: { id: admin.id } },
    });
  }

  private async validate(calendar: Calendar): Promise<boolean> {
    const calendarExist = await this.calendarModel.findOne({
      where: {
        id: Not(calendar.id),
        name: calendar.name,
      },
    });
    if (calendarExist)
      throw new BadRequestException('error.CALENDAR_ALREADY_EXIST');

    return true;
  }
}
