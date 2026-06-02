import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
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

  async findAll(query: FindFindingsQueryDto): Promise<FindingResponse[]> {
    const where: FindOptionsWhere<ResourceFinding> = {};
    const scanId = query.scanId ?? (await this.getLatestScanId());

    if (scanId) {
      where.scan = { id: scanId };
    }

    if (query.service) {
      where.service = query.service;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    const findings = await this.findingsRepository.find({
      where,
      relations: { scan: true },
      order: { createdAt: 'DESC' },
    });

    return findings.map((finding) => this.toResponse(finding));
  }

  private async getLatestScanId(): Promise<string | undefined> {
    const scan = await this.scansRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
      select: { id: true },
    });

    return scan?.id;
  }

  async findOne(id: string): Promise<FindingResponse> {
    const finding = await this.findingsRepository.findOne({
      where: { id },
      relations: { scan: true },
    });

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
