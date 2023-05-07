import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DateSchedule } from './date-schedule.entity';
import { Event } from './event.entity';
import { DaySchedule } from './day-schedule.entity';
import { Admin } from './admin.entity';

@Entity()
export class Calendar extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
  @OneToMany(() => DateSchedule, (dateSchedule) => dateSchedule.calendar, {
    cascade: true,
  })
  dateSchedules: DateSchedule[];
  @OneToMany(() => DaySchedule, (daySchedule) => daySchedule.calendar, {
    cascade: true,
  })
  daySchedules: DaySchedule[];
  @OneToMany(() => Event, (event) => event.calendar)
  events: Event[];
  @ManyToOne(() => Admin)
  admin: Admin;
}
