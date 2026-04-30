import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiKey } from './apikey.entity';
import { Plan } from './plan.enum';
import { User } from './user.entity';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'enum', enum: Plan, default: Plan.FREE })
  plan!: Plan;

  @OneToMany(() => User, (user) => user.organization)
  users!: User[];

  @OneToMany(() => ApiKey, (apiKey) => apiKey.org)
  apiKeys!: ApiKey[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
