import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity()
export class Admin extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  email: string;
  @Column({ type: 'varchar', length: 255, nullable: false })
  password: string;
  @Column({ type: 'varchar', length: 255, nullable: true })
  wppId: string;
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;
  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  sessionPath: string;
  @Column({ type: 'varchar', length: 255, nullable: false })
  connectString: string;
  @Column({ type: 'varchar', length: 300, nullable: true })
  refreshToken?: string;
}
