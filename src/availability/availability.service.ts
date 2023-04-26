import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarService } from 'src/calendar/calendar.service';
import { DateTime } from 'luxon';
import { AvailabilityOutput } from './models/availability.output';
import * as uuid from 'uuid';
import setTimeFromMinutes from 'src/utils/set-time-from-minutes';
import { GetEventService } from 'src/get-event/get-event.service';
import { ScheduleOutput } from 'src/models/schedule.output';
import convertHourToMinute from 'src/utils/convert-hour-to-minute';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly getEventService: GetEventService,
  ) {}

  public async getAvailability(
    calendarId: string,
    date: DateTime,
  ): Promise<AvailabilityOutput> {
    const calendar = await this.calendarService.getOne(calendarId);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
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

    schedules = this.sortSchedules(schedules);

    return { schedules };
  }

  private removeEmptyRanges(schedules: ScheduleOutput[]): ScheduleOutput[] {
    return schedules.filter((schedule) => schedule.from != schedule.to);
  }

  private sortSchedules(schedules: ScheduleOutput[]): ScheduleOutput[] {
    return schedules.sort((a, b) => (a.from < b.from ? -1 : 1));
  }

  private async removeBusyEventSchedules(
    calendarId: uuid,
    date: DateTime,
    schedules: ScheduleOutput[],
  ): Promise<ScheduleOutput[]> {
    const [events] = await this.getEventService.get(
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
  ): Promise<boolean> {
    //todo validate if event it is more one day
    const { schedules } = await this.getAvailability(
      calendarId,
      startDate.startOf('day'),
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
