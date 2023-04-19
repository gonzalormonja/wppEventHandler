import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarService } from 'src/calendar/calendar.service';

@Injectable()
export class AvailabilityService {
  constructor(private readonly calendarService: CalendarService) {}

  public async getAvailability(calendarId: string, date: Date) {
    const calendar = await this.calendarService.getOne(calendarId);
    if (!calendar) throw new NotFoundException('error.CALENDAR_NOT_FOUND');
    const inputWeekday = date.getDay();
    const dateSchedules = calendar.dateSchedules
      .filter((dateSchedule) => dateSchedule.date == date)
      .map(({ from, to }) => ({ from, to }));
    const daySchedules = calendar.daySchedules
      .filter((daySchedule) => daySchedule.weekday == inputWeekday)
      .map(({ from, to }) => ({ from, to }));
    let schedules = [...dateSchedules, ...daySchedules].sort((a, b) =>
      a.from < b.from ? -1 : 1,
    );
    let totalSchedules = schedules.length;
    let index = 0;
    while (index < totalSchedules) {
      if (index > 0) {
        const currentSchedule = schedules[index];
        const previousSchedule = schedules[index - 1];
        if (currentSchedule.from <= previousSchedule.to) {
          if (currentSchedule.to > previousSchedule.to)
            schedules[index - 1].to = currentSchedule.to;

          schedules = schedules.slice(index, 1);
          totalSchedules--;
        } else {
          index++;
        }
      } else {
        index++;
      }
    }
    //todo remove bussy schedules
    return schedules;
  }
}
