import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Event } from './event.entity';
import { Admin } from './admin.entity';

@Entity()
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  wppId: string;
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;
  @OneToMany(() => Event, (event) => event.user)
  events: Event[];
  @ManyToOne(() => Admin)
  admin: Admin;
}
