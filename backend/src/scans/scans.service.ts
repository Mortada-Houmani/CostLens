import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AwsAccount } from '../aws-accounts/aws-account.entity';
import { ScanQueueService } from '../scan-queue/scan-queue.service';
import { Scan, ScanStatus } from './scan.entity';

export interface ScanResponse {
  id: string;
  status: ScanStatus;
  findingsCount: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage?: string | null;
}

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
    @InjectRepository(AwsAccount)
    private readonly awsAccountsRepository: Repository<AwsAccount>,
    private readonly scanQueueService: ScanQueueService,
  ) {}

  async start(userId: string, awsAccountId: string): Promise<ScanResponse> {
    const awsAccount = await this.awsAccountsRepository.findOne({
      where: { id: awsAccountId, user: { id: userId } },
    });

    if (!awsAccount) {
      throw new NotFoundException(
        `AWS account "${awsAccountId}" was not found. Add the account before starting a scan.`,
      );
    }

    this.logger.log(`Queueing scan for AWS account ${awsAccountId}`);

    const scan = await this.scansRepository.save(
      this.scansRepository.create({
        awsAccount,
        status: ScanStatus.Queued,
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
      }),
    );

    await this.scanQueueService.addScanJob({
      scanId: scan.id,
      awsAccountId,
    });

    this.logger.log(`Queued scan ${scan.id} for AWS account ${awsAccountId}`);

    return this.toResponse(scan, 0);
  }

  async findAll(userId: string): Promise<ScanResponse[]> {
    const scans = await this.scansRepository.find({
      where: { awsAccount: { user: { id: userId } } },
      relations: { findings: true },
      order: { createdAt: 'DESC' },
    });

    return scans.map((scan) =>
      this.toResponse(scan, scan.findings?.length ?? 0),
    );
  }

  async findOne(userId: string, id: string): Promise<ScanResponse> {
    const scan = await this.scansRepository.findOne({
      where: { id, awsAccount: { user: { id: userId } } },
      relations: { findings: true },
    });

    if (!scan) {
      throw new NotFoundException(
        `Scan "${id}" was not found. Check the scan id and try again.`,
      );
    }

    return this.toResponse(scan, scan.findings?.length ?? 0);
  }

  private toResponse(scan: Scan, findingsCount: number): ScanResponse {
    return {
      id: scan.id,
      status: scan.status,
      findingsCount,
      createdAt: scan.createdAt,
      startedAt: scan.startedAt,
      finishedAt: scan.finishedAt,
      errorMessage:
        scan.status === ScanStatus.Failed ? scan.errorMessage : undefined,
    };
  }
}
