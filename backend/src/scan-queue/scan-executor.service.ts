import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AwsAccount } from '../aws-accounts/aws-account.entity';
import { AwsScannerService } from '../aws-scanner/aws-scanner.service';
import { Finding } from '../aws-scanner/interfaces/finding.interface';
import {
  FindingService,
  FindingSeverity,
  ResourceFinding,
} from '../findings/resource-finding.entity';
import { Scan, ScanStatus } from '../scans/scan.entity';
import { EncryptionService } from '../security/encryption.service';

@Injectable()
export class ScanExecutorService {
  private readonly logger = new Logger(ScanExecutorService.name);

  constructor(
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
    @InjectRepository(AwsAccount)
    private readonly awsAccountsRepository: Repository<AwsAccount>,
    @InjectRepository(ResourceFinding)
    private readonly findingsRepository: Repository<ResourceFinding>,
    private readonly awsScannerService: AwsScannerService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(scanId: string, awsAccountId: string): Promise<void> {
    const scan = await this.scansRepository.findOne({
      where: { id: scanId },
    });

    if (!scan) {
      throw new NotFoundException(`Scan with id "${scanId}" was not found`);
    }

    const awsAccount = await this.awsAccountsRepository
      .createQueryBuilder('awsAccount')
      .addSelect('awsAccount.secretAccessKey')
      .where('awsAccount.id = :awsAccountId', { awsAccountId })
      .getOne();

    if (!awsAccount) {
      await this.markFailed(
        scan,
        `AWS account with id "${awsAccountId}" was not found`,
      );
      return;
    }

    scan.status = ScanStatus.Running;
    scan.startedAt = new Date();
    scan.errorMessage = null;
    await this.scansRepository.save(scan);
    this.logger.log(`Started scan ${scan.id} for AWS account ${awsAccountId}`);

    try {
      const accountForScan = {
        ...awsAccount,
        secretAccessKey: this.encryptionService.decrypt(
          awsAccount.secretAccessKey,
        ),
      };
      const findings = await this.awsScannerService.scanAccount(accountForScan);
      const resourceFindings = findings.map((finding) =>
        this.toResourceFinding(finding, scan),
      );

      if (resourceFindings.length > 0) {
        await this.findingsRepository.save(resourceFindings);
      }

      scan.status = ScanStatus.Success;
      scan.finishedAt = new Date();
      scan.errorMessage = null;
      await this.scansRepository.save(scan);
      this.logger.log(
        `Completed scan ${scan.id} with ${resourceFindings.length} findings`,
      );
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Scan ${scan.id} failed: ${errorMessage}`);
      await this.markFailed(scan, errorMessage);
    }
  }

  private async markFailed(scan: Scan, errorMessage: string): Promise<void> {
    scan.status = ScanStatus.Failed;
    scan.finishedAt = new Date();
    scan.errorMessage = errorMessage;
    await this.scansRepository.save(scan);
  }

  private toResourceFinding(finding: Finding, scan: Scan): ResourceFinding {
    return this.findingsRepository.create({
      scan,
      service: finding.service as FindingService,
      resourceId: finding.resourceId,
      resourceName: finding.resourceName ?? null,
      region: finding.region,
      severity: finding.severity as FindingSeverity,
      type: finding.type,
      message: finding.message,
      estimatedMonthlyWaste:
        finding.estimatedMonthlyWaste === undefined
          ? null
          : finding.estimatedMonthlyWaste.toString(),
      recommendation: finding.recommendation,
      fixCommand: finding.fixCommand ?? null,
      metadata: finding.metadata ?? null,
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown scan error';
  }
}
