import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Admin } from './admin.entity';

@Entity()
export class TypeEvent extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;
  @Column({ type: 'int', nullable: false })
  durationInMinutes: number;
  @ManyToOne(() => Admin)
  admin: Admin;
}
