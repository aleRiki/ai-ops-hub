import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { OAuthProvider } from './oauthprovider.enum';
import { User } from './user.entity';

@Entity()
@Unique(['provider', 'providerUserId'])
@Index(['userId'])
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: OAuthProvider })
  provider!: OAuthProvider;

  @Column()
  providerUserId!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.oauthAccounts, { onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
