import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Scan } from '../scans/scan.entity';
import { User } from '../users/user.entity';

@Entity('aws_accounts')
export class AwsAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  accountName: string;

  @Column()
  accessKeyId: string;

  @Column({ select: false })
  secretAccessKey: string;

  @Column()
  region: string;

  @ManyToOne(() => User, (user) => user.awsAccounts, { nullable: false })
  user: User;

  @OneToMany(() => Scan, (scan) => scan.awsAccount)
  scans: Scan[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
