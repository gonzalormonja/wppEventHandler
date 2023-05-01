import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Calendar } from 'src/entities/calendar.entity';
import { Not, Repository } from 'typeorm';
import { CreateCalendar } from './models/create-calendar.input';
import { DayScheduleInput } from './models/day-schedule.input';
import { DaySchedule } from 'src/entities/day-schedule.entity';
import { UpdateCalendar } from './models/update-calendar.input';
import { DateScheduleInput } from './models/date-schedule.input';
import { DateSchedule } from 'src/entities/date-schedule.entity';
import convertHourToMinute from 'src/utils/convert-hour-to-minute';
import * as uuid from 'uuid';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Calendar)
    private readonly calendarModel: Repository<Calendar>,
  ) {}

  public async create({ daySchedules, name }: CreateCalendar) {
    const calendar = this.calendarModel.create({ id: uuid.v4(), name });

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
  ): Promise<Calendar> {
    const calendar = await this.getOne(id);
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
  ): Promise<Calendar> {
    const calendar = await this.getOne(calendarId);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
    const dateSchedule = this.parseDateSchedule(dateScheduleInput);
    calendar.dateSchedules = [...calendar.dateSchedules, dateSchedule];
    return this.calendarModel.save(calendar);
  }

  public async removeDate(
    calendarId: string,
    dateScheduleId: string,
  ): Promise<Calendar> {
    const calendar = await this.getOne(calendarId);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
    calendar.dateSchedules = calendar.dateSchedules.filter(
      (date) => date.id != dateScheduleId,
    );
    return this.calendarModel.save(calendar);
  }

  public async delete(id: string): Promise<void> {
    const calendar = await this.getOne(id);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
    await this.calendarModel.softRemove(calendar);
  }

  public async get(): Promise<[Calendar[], number]> {
    return this.calendarModel.findAndCount({
      relations: ['dateSchedules', 'daySchedules'],
      order: {
        daySchedules: {
          from: 'ASC',
        },
      },
    });
  }

  public async getOne(id: string): Promise<Calendar> {
    return this.calendarModel.findOne({
      relations: ['dateSchedules', 'daySchedules'],
      where: { id },
    });
  }

  public async getOneBy(column: string, value: string): Promise<Calendar> {
    return this.calendarModel.findOne({
      relations: ['dateSchedules', 'daySchedules'],
      where: { [column]: value },
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
