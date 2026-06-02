import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scan, ScanStatus } from '../scans/scan.entity';
import { FindFindingsQueryDto } from './dto/find-findings-query.dto';
import {
  FindingService,
  FindingSeverity,
  ResourceFinding,
} from './resource-finding.entity';

export interface FindingResponse {
  id: string;
  service: FindingService;
  resourceId: string;
  resourceName: string | null;
  region: string;
  severity: FindingSeverity;
  type: string;
  message: string;
  estimatedMonthlyWaste: string | null;
  recommendation: string;
  fixCommand: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  scan: {
    id: string;
    status: ScanStatus;
  };
}

@Injectable()
export class FindingsService {
  constructor(
    @InjectRepository(ResourceFinding)
    private readonly findingsRepository: Repository<ResourceFinding>,
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
  ) {}

  async findAll(
    userId: string,
    query: FindFindingsQueryDto,
  ): Promise<FindingResponse[]> {
    const scanId = query.scanId ?? (await this.getLatestScanId(userId));
    const findingsQuery = this.findingsRepository
      .createQueryBuilder('finding')
      .innerJoinAndSelect('finding.scan', 'scan')
      .innerJoin('scan.awsAccount', 'awsAccount')
      .innerJoin('awsAccount.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('finding.createdAt', 'DESC');

    if (scanId) {
      findingsQuery.andWhere('scan.id = :scanId', { scanId });
    }

    if (query.service) {
      findingsQuery.andWhere('finding.service = :service', {
        service: query.service,
      });
    }

    if (query.severity) {
      findingsQuery.andWhere('finding.severity = :severity', {
        severity: query.severity,
      });
    }

    const findings = await findingsQuery.getMany();

    return findings.map((finding) => this.toResponse(finding));
  }

  private async getLatestScanId(userId: string): Promise<string | undefined> {
    const scan = await this.scansRepository
      .createQueryBuilder('scan')
      .innerJoin('scan.awsAccount', 'awsAccount')
      .innerJoin('awsAccount.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('scan.createdAt', 'DESC')
      .select('scan.id')
      .getOne();

    return scan?.id;
  }

  async findOne(userId: string, id: string): Promise<FindingResponse> {
    const finding = await this.findingsRepository
      .createQueryBuilder('finding')
      .innerJoinAndSelect('finding.scan', 'scan')
      .innerJoin('scan.awsAccount', 'awsAccount')
      .innerJoin('awsAccount.user', 'user')
      .where('finding.id = :id', { id })
      .andWhere('user.id = :userId', { userId })
      .getOne();

    if (!finding) {
      throw new NotFoundException(
        `Finding "${id}" was not found. It may belong to a deleted scan.`,
      );
    }

    return this.toResponse(finding);
  }

  private toResponse(finding: ResourceFinding): FindingResponse {
    return {
      id: finding.id,
      service: finding.service,
      resourceId: finding.resourceId,
      resourceName: finding.resourceName,
      region: finding.region,
      severity: finding.severity,
      type: finding.type,
      message: finding.message,
      estimatedMonthlyWaste: finding.estimatedMonthlyWaste,
      recommendation: finding.recommendation,
      fixCommand: finding.fixCommand,
      metadata: finding.metadata,
      createdAt: finding.createdAt,
      scan: {
        id: finding.scan.id,
        status: finding.scan.status,
      },
    };
  }
}
