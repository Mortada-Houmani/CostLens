import {
  DBInstance,
  DescribeDBInstancesCommand,
  RDSClient,
} from '@aws-sdk/client-rds';
import { Injectable } from '@nestjs/common';
import { AwsAccount } from '../../aws-accounts/aws-account.entity';
import { RecommendationService } from '../../recommendations/recommendation.service';
import { RecommendationType } from '../../recommendations/rules';
import { Finding } from '../interfaces/finding.interface';

@Injectable()
export class RdsScanner {
  constructor(private readonly recommendationService: RecommendationService) {}

  async scan(account: AwsAccount): Promise<Finding[]> {
    const client = new RDSClient({
      region: account.region,
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
      },
    });

    const dbInstances = await this.getDbInstances(client);

    return dbInstances.flatMap((dbInstance) =>
      this.toDbInstanceFindings(dbInstance, account.region),
    );
  }

  private async getDbInstances(client: RDSClient): Promise<DBInstance[]> {
    const dbInstances: DBInstance[] = [];
    let marker: string | undefined;

    do {
      const response = await client.send(
        new DescribeDBInstancesCommand({
          Marker: marker,
        }),
      );

      dbInstances.push(...(response.DBInstances ?? []));
      marker = response.Marker;
    } while (marker);

    return dbInstances;
  }

  private toDbInstanceFindings(
    dbInstance: DBInstance,
    region: string,
  ): Finding[] {
    if (!dbInstance.DBInstanceIdentifier) {
      return [];
    }

    const findings: Finding[] = [];

    if (dbInstance.PubliclyAccessible === true) {
      findings.push(this.toFinding(dbInstance, region, 'PUBLIC_RDS_INSTANCE'));
    }

    if (dbInstance.BackupRetentionPeriod === 0) {
      findings.push(this.toFinding(dbInstance, region, 'RDS_BACKUPS_DISABLED'));
    }

    if (dbInstance.StorageEncrypted === false) {
      findings.push(
        this.toFinding(dbInstance, region, 'RDS_ENCRYPTION_DISABLED'),
      );
    }

    return findings;
  }

  private toFinding(
    dbInstance: DBInstance,
    region: string,
    type: RecommendationType,
  ): Finding {
    const recommendation = this.recommendationService.build(type, {
      resourceId: dbInstance.DBInstanceIdentifier,
      region,
    });

    return {
      service: 'RDS',
      resourceId: dbInstance.DBInstanceIdentifier ?? 'unknown',
      resourceName: dbInstance.DBName,
      region,
      severity: recommendation.severity,
      type: recommendation.type,
      message: recommendation.message,
      recommendation: recommendation.recommendation,
      fixCommand: recommendation.fixCommand,
      metadata: this.toMetadata(dbInstance),
    };
  }

  private toMetadata(dbInstance: DBInstance): Record<string, any> {
    return {
      dbInstanceIdentifier: dbInstance.DBInstanceIdentifier,
      engine: dbInstance.Engine,
      dbInstanceClass: dbInstance.DBInstanceClass,
      dbInstanceStatus: dbInstance.DBInstanceStatus,
      allocatedStorage: dbInstance.AllocatedStorage,
      publiclyAccessible: dbInstance.PubliclyAccessible,
      backupRetentionPeriod: dbInstance.BackupRetentionPeriod,
      storageEncrypted: dbInstance.StorageEncrypted,
      multiAZ: dbInstance.MultiAZ,
    };
  }
}
