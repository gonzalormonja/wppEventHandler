import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Calendar } from './calendar.entity';

@Entity()
export class DateSchedule extends BaseEntity {
  @Column({ type: 'date', nullable: false })
  date: Date;
  @Column({ type: 'int', nullable: false })
  from: number;
  @Column({ type: 'int', nullable: false })
  to: number;
  @ManyToOne(() => Calendar)
  calendar?: Calendar;
}
