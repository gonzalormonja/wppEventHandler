import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class Admin extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  wppId: string;
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;
  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  sessionPath: string;
  @Column({ type: 'varchar', length: 255, nullable: false })
  connectString: string;
}
