import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Status } from '../models/status.enum';
import { Calendar } from './calendar.entity';
import { User } from './user.entity';

@Entity()
export class Event extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  description: string;
  @Column({ type: 'date', nullable: false })
  dateTime: Date;
  @Column({ type: 'enum', enum: Status, default: Status.Pending })
  status: Status;
  @ManyToOne(() => Calendar)
  calendar: Calendar;
  @ManyToOne(() => User)
  user: User;
}
