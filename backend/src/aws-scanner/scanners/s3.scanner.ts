import {
  Bucket,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  PublicAccessBlockConfiguration,
  ServerSideEncryptionConfiguration,
  S3Client,
  VersioningConfiguration,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { AwsAccount } from '../../aws-accounts/aws-account.entity';
import { RecommendationService } from '../../recommendations/recommendation.service';
import { RecommendationType } from '../../recommendations/rules';
import { Finding } from '../interfaces/finding.interface';

interface BucketChecks {
  publicAccessBlock: PublicAccessBlockConfiguration | null;
  encryption: ServerSideEncryptionConfiguration | null;
  versioning: VersioningConfiguration | null;
  errors: Record<string, string>;
}

@Injectable()
export class S3Scanner {
  constructor(private readonly recommendationService: RecommendationService) {}

  async scan(account: AwsAccount): Promise<Finding[]> {
    const client = new S3Client({
      region: account.region,
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
      },
    });

    const response = await client.send(new ListBucketsCommand({}));
    const buckets = response.Buckets ?? [];
    const bucketFindings = await Promise.all(
      buckets.map((bucket) => this.scanBucket(client, bucket, account.region)),
    );

    return bucketFindings.flat();
  }

  private async scanBucket(
    client: S3Client,
    bucket: Bucket,
    region: string,
  ): Promise<Finding[]> {
    if (!bucket.Name) {
      return [];
    }

    const checks = await this.getBucketChecks(client, bucket.Name);
    const findings: Finding[] = [];

    if (!this.isPublicAccessFullyBlocked(checks.publicAccessBlock)) {
      findings.push(
        this.toFinding(
          bucket,
          region,
          checks,
          'S3_PUBLIC_ACCESS_NOT_FULLY_BLOCKED',
        ),
      );
    }

    if (!checks.encryption) {
      findings.push(
        this.toFinding(bucket, region, checks, 'S3_ENCRYPTION_DISABLED'),
      );
    }

    if (checks.versioning?.Status !== 'Enabled') {
      findings.push(
        this.toFinding(bucket, region, checks, 'S3_VERSIONING_DISABLED'),
      );
    }

    return findings;
  }

  private async getBucketChecks(
    client: S3Client,
    bucketName: string,
  ): Promise<BucketChecks> {
    const checks: BucketChecks = {
      publicAccessBlock: null,
      encryption: null,
      versioning: null,
      errors: {},
    };

    try {
      const response = await client.send(
        new GetPublicAccessBlockCommand({ Bucket: bucketName }),
      );
      checks.publicAccessBlock =
        response.PublicAccessBlockConfiguration ?? null;
    } catch (error) {
      checks.errors.publicAccessBlock = this.getErrorMessage(error);
    }

    try {
      const response = await client.send(
        new GetBucketEncryptionCommand({ Bucket: bucketName }),
      );
      checks.encryption = response.ServerSideEncryptionConfiguration ?? null;
    } catch (error) {
      checks.errors.encryption = this.getErrorMessage(error);
    }

    try {
      const response = await client.send(
        new GetBucketVersioningCommand({ Bucket: bucketName }),
      );
      checks.versioning = {
        Status: response.Status,
        MFADelete: response.MFADelete,
      };
    } catch (error) {
      checks.errors.versioning = this.getErrorMessage(error);
    }

    return checks;
  }

  private isPublicAccessFullyBlocked(
    publicAccessBlock: PublicAccessBlockConfiguration | null,
  ): boolean {
    return (
      publicAccessBlock?.BlockPublicAcls === true &&
      publicAccessBlock.IgnorePublicAcls === true &&
      publicAccessBlock.BlockPublicPolicy === true &&
      publicAccessBlock.RestrictPublicBuckets === true
    );
  }

  private toFinding(
    bucket: Bucket,
    region: string,
    checks: BucketChecks,
    type: RecommendationType,
  ): Finding {
    const bucketName = bucket.Name ?? 'unknown';
    const recommendation = this.recommendationService.build(type, {
      resourceId: bucketName,
      region,
    });

    return {
      service: 'S3',
      resourceId: bucketName,
      resourceName: bucketName,
      region,
      severity: recommendation.severity,
      type: recommendation.type,
      message: recommendation.message,
      recommendation: recommendation.recommendation,
      fixCommand: recommendation.fixCommand,
      metadata: this.toMetadata(bucket, checks),
    };
  }

  private toMetadata(
    bucket: Bucket,
    checks: BucketChecks,
  ): Record<string, any> {
    return {
      bucketName: bucket.Name,
      creationDate: bucket.CreationDate?.toISOString(),
      publicAccessBlock: checks.publicAccessBlock,
      encryption: checks.encryption,
      versioning: checks.versioning,
      checkErrors: checks.errors,
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown S3 bucket check error';
  }
}
