import { InternalServerErrorException, Injectable } from '@nestjs/common';
import { AwsAccount } from '../aws-accounts/aws-account.entity';
import { Finding } from './interfaces/finding.interface';
import { EbsScanner } from './scanners/ebs.scanner';
import { Ec2Scanner } from './scanners/ec2.scanner';
import { RdsScanner } from './scanners/rds.scanner';
import { S3Scanner } from './scanners/s3.scanner';

@Injectable()
export class AwsScannerService {
  constructor(
    private readonly ebsScanner: EbsScanner,
    private readonly ec2Scanner: Ec2Scanner,
    private readonly s3Scanner: S3Scanner,
    private readonly rdsScanner: RdsScanner,
  ) {}

  async scanAccount(account: AwsAccount): Promise<Finding[]> {
    try {
      const [ebsFindings, ec2Findings, s3Findings, rdsFindings] =
        await Promise.all([
          this.ebsScanner.scan(account),
          this.ec2Scanner.scan(account),
          this.s3Scanner.scan(account),
          this.rdsScanner.scan(account),
        ]);

      return [...ebsFindings, ...ec2Findings, ...s3Findings, ...rdsFindings];
    } catch (error) {
      throw new InternalServerErrorException(
        `AWS account scan failed: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown scanner error';
  }
}
