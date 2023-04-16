import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Calendar } from './calendar.entity';

@Entity()
export class DaySchedule extends BaseEntity {
  @Column({ type: 'int', nullable: false })
  weekday: number;
  @Column({ type: 'int', nullable: false })
  from: number;
  @Column({ type: 'int', nullable: false })
  to: number;
  @ManyToOne(() => Calendar)
  calendar?: Calendar;
}
