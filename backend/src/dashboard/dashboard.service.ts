import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  FindingService,
  FindingSeverity,
  ResourceFinding,
} from '../findings/resource-finding.entity';
import { Scan, ScanStatus } from '../scans/scan.entity';

interface WasteSumResult {
  total: string | null;
}

interface FindingsByServiceResult {
  service: FindingService;
  count: string;
}

export interface LatestFindingResponse {
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

export interface LatestScanResponse {
  id: string;
  status: ScanStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface DashboardSummaryResponse {
  totalFindings: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  estimatedMonthlyWaste: number;
  findingsByService: Record<FindingService, number>;
  latestScan: LatestScanResponse | null;
  totalScans: number;
  failedScans: number;
  successfulScans: number;
  latestFindings: LatestFindingResponse[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ResourceFinding)
    private readonly findingsRepository: Repository<ResourceFinding>,
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
  ) {}

  async getSummary(userId: string): Promise<DashboardSummaryResponse> {
    const latestScanEntity = await this.getLatestScanEntity(userId);
    const latestScan = latestScanEntity
      ? this.toLatestScanResponse(latestScanEntity)
      : null;

    const [
      totalFindings,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      estimatedMonthlyWaste,
      findingsByService,
      totalScans,
      failedScans,
      successfulScans,
      latestFindings,
    ] = await Promise.all([
      this.countFindingsForScan(latestScanEntity?.id),
      this.countFindingsForScan(latestScanEntity?.id, FindingSeverity.High),
      this.countFindingsForScan(latestScanEntity?.id, FindingSeverity.Medium),
      this.countFindingsForScan(latestScanEntity?.id, FindingSeverity.Low),
      this.getEstimatedMonthlyWaste(latestScanEntity?.id),
      this.getFindingsByService(latestScanEntity?.id),
      this.countScans(userId),
      this.countScans(userId, ScanStatus.Failed),
      this.countScans(userId, ScanStatus.Success),
      this.getLatestFindings(latestScanEntity?.id),
    ]);

    return {
      totalFindings,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      estimatedMonthlyWaste,
      findingsByService,
      latestScan,
      totalScans,
      failedScans,
      successfulScans,
      latestFindings,
    };
  }

  private async countFindingsForScan(
    scanId?: string,
    severity?: FindingSeverity,
  ): Promise<number> {
    if (!scanId) {
      return 0;
    }

    const query = this.createFindingsForScanQuery(scanId);

    if (severity) {
      query.andWhere('finding.severity = :severity', { severity });
    }

    return query.getCount();
  }

  private async getEstimatedMonthlyWaste(scanId?: string): Promise<number> {
    if (!scanId) {
      return 0;
    }

    const result = await this.createFindingsForScanQuery(scanId)
      .select('COALESCE(SUM(finding.estimatedMonthlyWaste), 0)', 'total')
      .getRawOne<WasteSumResult>();

    return Number(result?.total ?? 0);
  }

  private async getFindingsByService(
    scanId?: string,
  ): Promise<Record<FindingService, number>> {
    const findingsByService: Record<FindingService, number> = {
      [FindingService.EC2]: 0,
      [FindingService.EBS]: 0,
      [FindingService.S3]: 0,
      [FindingService.RDS]: 0,
      [FindingService.ECS]: 0,
    };

    if (!scanId) {
      return findingsByService;
    }

    const query = this.createFindingsForScanQuery(scanId);
    const rows = await query
      .select('finding.service', 'service')
      .addSelect('COUNT(finding.id)', 'count')
      .groupBy('finding.service')
      .getRawMany<FindingsByServiceResult>();

    for (const row of rows) {
      findingsByService[row.service] = Number(row.count);
    }

    return findingsByService;
  }

  private async getLatestScanEntity(userId: string): Promise<Scan | null> {
    return this.scansRepository
      .createQueryBuilder('scan')
      .innerJoin('scan.awsAccount', 'awsAccount')
      .innerJoin('awsAccount.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('scan.createdAt', 'DESC')
      .getOne();
  }

  private async countScans(
    userId: string,
    status?: ScanStatus,
  ): Promise<number> {
    const query = this.scansRepository
      .createQueryBuilder('scan')
      .innerJoin('scan.awsAccount', 'awsAccount')
      .innerJoin('awsAccount.user', 'user')
      .where('user.id = :userId', { userId });

    if (status) {
      query.andWhere('scan.status = :status', { status });
    }

    return query.getCount();
  }

  private toLatestScanResponse(scan: Scan): LatestScanResponse {
    return {
      id: scan.id,
      status: scan.status,
      startedAt: scan.startedAt,
      finishedAt: scan.finishedAt,
      errorMessage: scan.errorMessage,
      createdAt: scan.createdAt,
    };
  }

  private async getLatestFindings(
    scanId?: string,
  ): Promise<LatestFindingResponse[]> {
    if (!scanId) {
      return [];
    }

    const findings = await this.findingsRepository.find({
      where: { scan: { id: scanId } },
      relations: { scan: true },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return findings.map((finding) => this.toLatestFindingResponse(finding));
  }

  private createFindingsForScanQuery(
    scanId: string,
  ): SelectQueryBuilder<ResourceFinding> {
    return this.findingsRepository
      .createQueryBuilder('finding')
      .innerJoin('finding.scan', 'scan')
      .where('scan.id = :scanId', { scanId });
  }

  private toLatestFindingResponse(
    finding: ResourceFinding,
  ): LatestFindingResponse {
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
