import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async getSummary(): Promise<DashboardSummaryResponse> {
    const [
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
    ] = await Promise.all([
      this.findingsRepository.count(),
      this.findingsRepository.count({
        where: { severity: FindingSeverity.High },
      }),
      this.findingsRepository.count({
        where: { severity: FindingSeverity.Medium },
      }),
      this.findingsRepository.count({
        where: { severity: FindingSeverity.Low },
      }),
      this.getEstimatedMonthlyWaste(),
      this.getFindingsByService(),
      this.getLatestScan(),
      this.scansRepository.count(),
      this.scansRepository.count({ where: { status: ScanStatus.Failed } }),
      this.scansRepository.count({ where: { status: ScanStatus.Success } }),
      this.getLatestFindings(),
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

  private async getEstimatedMonthlyWaste(): Promise<number> {
    const result = await this.findingsRepository
      .createQueryBuilder('finding')
      .select('COALESCE(SUM(finding.estimatedMonthlyWaste), 0)', 'total')
      .getRawOne<WasteSumResult>();

    return Number(result?.total ?? 0);
  }

  private async getFindingsByService(): Promise<
    Record<FindingService, number>
  > {
    const rows = await this.findingsRepository
      .createQueryBuilder('finding')
      .select('finding.service', 'service')
      .addSelect('COUNT(finding.id)', 'count')
      .groupBy('finding.service')
      .getRawMany<FindingsByServiceResult>();

    const findingsByService: Record<FindingService, number> = {
      [FindingService.EC2]: 0,
      [FindingService.EBS]: 0,
      [FindingService.S3]: 0,
      [FindingService.RDS]: 0,
    };

    for (const row of rows) {
      findingsByService[row.service] = Number(row.count);
    }

    return findingsByService;
  }

  private async getLatestScan(): Promise<LatestScanResponse | null> {
    const scan = await this.scansRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    if (!scan) {
      return null;
    }

    return {
      id: scan.id,
      status: scan.status,
      startedAt: scan.startedAt,
      finishedAt: scan.finishedAt,
      errorMessage: scan.errorMessage,
      createdAt: scan.createdAt,
    };
  }

  private async getLatestFindings(): Promise<LatestFindingResponse[]> {
    const findings = await this.findingsRepository.find({
      relations: { scan: true },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return findings.map((finding) => this.toLatestFindingResponse(finding));
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
