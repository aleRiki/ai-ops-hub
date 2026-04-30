import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity()
@Index(['userId'])
@Index(['orgId'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  keyHash!: string;

  @Column()
  prefix!: string;

  @Column()
  userId!: string;

  @Column()
  orgId!: string;

  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Organization, (org) => org.apiKeys, { onDelete: 'CASCADE' })
  org!: Organization;

  @Column({ nullable: true })
  lastUsed!: Date;

  @Column({ nullable: true })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
