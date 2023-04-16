import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DateSchedule } from './date-schedule.entity';
import { Event } from './event.entity';
import { DaySchedule } from './day-schedule.entity';

@Entity()
export class Calendar extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
  @OneToMany(() => DateSchedule, (dateSchedule) => dateSchedule.calendar)
  dateSchedules: DateSchedule[];
  @OneToMany(() => DaySchedule, (daySchedule) => daySchedule.calendar)
  daySchedules: DaySchedule[];
  @OneToMany(() => Event, (event) => event.calendar)
  events: Event[];
}
