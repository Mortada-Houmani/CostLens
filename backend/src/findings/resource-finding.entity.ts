import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Scan } from '../scans/scan.entity';

export enum FindingService {
  EC2 = 'EC2',
  EBS = 'EBS',
  S3 = 'S3',
  RDS = 'RDS',
}

export enum FindingSeverity {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
}

@Entity('resource_findings')
export class ResourceFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Scan, (scan) => scan.findings, { nullable: false })
  scan: Scan;

  @Column({
    type: 'enum',
    enum: FindingService,
  })
  service: FindingService;

  @Column()
  resourceId: string;

  @Column({ nullable: true })
  resourceName: string | null;

  @Column()
  region: string;

  @Column({
    type: 'enum',
    enum: FindingSeverity,
  })
  severity: FindingSeverity;

  @Column()
  type: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'decimal', nullable: true })
  estimatedMonthlyWaste: string | null;

  @Column({ type: 'text' })
  recommendation: string;

  @Column({ type: 'text', nullable: true })
  fixCommand: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
