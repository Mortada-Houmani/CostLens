import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AwsAccount } from '../aws-accounts/aws-account.entity';
import { ResourceFinding } from '../findings/resource-finding.entity';

export enum ScanStatus {
  Queued = 'queued',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
}

@Entity('scans')
export class Scan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AwsAccount, (awsAccount) => awsAccount.scans, {
    nullable: false,
  })
  awsAccount: AwsAccount;

  @Column({
    type: 'enum',
    enum: ScanStatus,
    default: ScanStatus.Queued,
  })
  status: ScanStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @OneToMany(() => ResourceFinding, (finding) => finding.scan)
  findings: ResourceFinding[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
