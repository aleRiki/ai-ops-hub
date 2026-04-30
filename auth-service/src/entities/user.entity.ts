import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiKey } from './apikey.entity';
import { OAuthAccount } from './oauthaccount.entity';
import { Organization } from './organization.entity';
import { RefreshToken } from './refreshtoken.entity';
import { Role } from './role.enum';

@Entity()
@Index(['orgId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  passwordHash!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: Role, default: Role.MEMBER })
  role!: Role;

  @Column()
  orgId!: string;

  @ManyToOne(() => Organization, (org) => org.users)
  organization!: Organization;

  @OneToMany(() => OAuthAccount, (oauth) => oauth.user)
  oauthAccounts!: OAuthAccount[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys!: ApiKey[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
