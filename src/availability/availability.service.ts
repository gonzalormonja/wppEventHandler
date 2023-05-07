import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarService } from '../calendar/calendar.service';
import { DateTime } from 'luxon';
import { AvailabilityOutput } from './models/availability.output';
import * as uuid from 'uuid';
import setTimeFromMinutes from '../utils/set-time-from-minutes';
import { GetEventService } from '../get-event/get-event.service';
import { ScheduleOutput } from '../models/schedule.output';
import convertHourToMinute from '../utils/convert-hour-to-minute';
import { TypeEvent } from '../entities/type-event.entity';
import { TypeEventService } from '../type-event/type-event.service';
import { Admin } from 'src/entities/admin.entity';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly getEventService: GetEventService,
    private readonly typeEventService: TypeEventService,
  ) {}

  public async getAvailability(
    calendarId: string,
    date: DateTime,
    typeEventId: string,
    admin: Admin,
  ): Promise<AvailabilityOutput> {
    const calendar = await this.calendarService.getOne(calendarId, admin);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
    const typeEvent = await this.typeEventService.getOne(typeEventId, admin);
    if (!typeEvent) throw new NotFoundException('error.TYPE_EVENT_NOT_FOUND');
    const inputWeekday = date.weekday;
    const dateSchedules = calendar.dateSchedules
      .filter((dateSchedule) =>
        DateTime.fromJSDate(dateSchedule.date).equals(date),
      )
      .map(({ from, to }) => ({ from, to }));
    const daySchedules = calendar.daySchedules
      .filter((daySchedule) => daySchedule.weekday == inputWeekday)
      .map(({ from, to }) => ({ from, to }));

    let schedules = [...dateSchedules, ...daySchedules];

    schedules = await this.removeBusyEventSchedules(
      calendarId,
      date,
      schedules,
    );

    schedules = this.groupSchedules(schedules);

    schedules = this.removeEmptyRanges(schedules);

    schedules = this.filteredRanges(schedules, typeEvent);

    schedules = this.sortSchedules(schedules);

    return { schedules };
  }

  private removeEmptyRanges(schedules: ScheduleOutput[]): ScheduleOutput[] {
    return schedules.filter((schedule) => schedule.from != schedule.to);
  }

  private sortSchedules(schedules: ScheduleOutput[]): ScheduleOutput[] {
    return schedules.sort((a, b) => (a.from < b.from ? -1 : 1));
  }

  private filteredRanges(
    schedules: ScheduleOutput[],
    typeEvent: TypeEvent,
  ): ScheduleOutput[] {
    return schedules.filter(
      (schedule) => schedule.to - schedule.from > typeEvent.durationInMinutes,
    );
  }

  private async removeBusyEventSchedules(
    calendarId: uuid,
    date: DateTime,
    schedules: ScheduleOutput[],
  ): Promise<ScheduleOutput[]> {
    const [events] = await this.getEventService.get(
      null,
      calendarId,
      date.startOf('day'),
      date.endOf('day'),
    );
    events.forEach(({ startDateTime, endDateTime }) => {
      const endDate = DateTime.fromJSDate(endDateTime);
      const startDate = DateTime.fromJSDate(startDateTime);

      let totalSchedules = schedules.length;
      let index = 0;
      while (index < totalSchedules) {
        const schedule = schedules[index];
        //the event is contain between schedule range
        if (
          setTimeFromMinutes(endDate, schedule.from) <= endDate &&
          setTimeFromMinutes(endDate, schedule.to) >= endDate &&
          setTimeFromMinutes(startDate, schedule.to) >= startDate &&
          setTimeFromMinutes(startDate, schedule.from) <= startDate
        ) {
          schedules.push({
            from: convertHourToMinute(endDate.toFormat('HH:mm')),
            to: schedules[index].to,
          });
          schedules[index].to = convertHourToMinute(
            startDate.toFormat('HH:mm'),
          );
          totalSchedules++;
        } else if (
          //the event start before start schedule range but end before end schedule range
          setTimeFromMinutes(endDate, schedule.from) <= endDate &&
          setTimeFromMinutes(endDate, schedule.to) >= endDate
        ) {
          schedules[index].from = convertHourToMinute(
            endDate.toFormat('HH:mm'),
          );
        } else if (
          //the event end before end schedule range but start after start schedule range
          setTimeFromMinutes(startDate, schedule.to) >= startDate &&
          setTimeFromMinutes(startDate, schedule.from) <= startDate
        ) {
          schedules[index].to = convertHourToMinute(
            startDate.toFormat('HH:mm'),
          );
        }
        index++;
      }
    });
    return schedules;
  }

  private groupSchedules(schedules: ScheduleOutput[]): ScheduleOutput[] {
    schedules = this.sortSchedules(schedules);
    let totalSchedules = schedules.length;
    let index = 0;
    while (index < totalSchedules) {
      if (index > 0) {
        const currentSchedule = schedules[index];
        const previousSchedule = schedules[index - 1];
        if (currentSchedule.from <= previousSchedule.to) {
          if (currentSchedule.to > previousSchedule.to)
            schedules[index - 1].to = currentSchedule.to;

          schedules = schedules.filter((el, _index) => _index != index);
          totalSchedules--;
        } else {
          index++;
        }
      } else {
        index++;
      }
    }
    return schedules;
  }

  public async validateDate(
    startDate: DateTime,
    endDate: DateTime,
    calendarId: uuid,
    typeEVentId: string,
    admin: Admin,
  ): Promise<boolean> {
    //todo validate if event it is more one day
    const { schedules } = await this.getAvailability(
      calendarId,
      startDate.startOf('day'),
      typeEVentId,
      admin,
    );

    const matchedSchedule = schedules.find((schedule) => {
      if (
        setTimeFromMinutes(endDate, schedule.from) <= endDate &&
        setTimeFromMinutes(endDate, schedule.to) >= endDate &&
        setTimeFromMinutes(startDate, schedule.to) >= startDate &&
        setTimeFromMinutes(startDate, schedule.from) <= startDate
      )
        return true;
    });

    return !!matchedSchedule;
  }
}
