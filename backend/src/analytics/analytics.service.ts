import {
  GetMetricDataCommand,
  MetricDataQuery,
  MetricDataResult,
  CloudWatchClient,
  StandardUnit,
} from '@aws-sdk/client-cloudwatch';
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from '@aws-sdk/client-cost-explorer';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AwsAccount } from '../aws-accounts/aws-account.entity';
import {
  FindingService,
  ResourceFinding,
} from '../findings/resource-finding.entity';
import { Scan } from '../scans/scan.entity';
import { EncryptionService } from '../security/encryption.service';

type AnalyticsRange = 'weekly' | 'monthly';

export interface AnalyticsResource {
  id: string;
  name: string;
  service: FindingService;
  metadata: Record<string, unknown> | null;
}

export interface MetricPoint {
  label: string;
  cost: number | null;
  cpu: number | null;
  memory: number | null;
  network: number | null;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ResourceFinding)
    private readonly findingsRepository: Repository<ResourceFinding>,
    @InjectRepository(Scan)
    private readonly scansRepository: Repository<Scan>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getResources(
    userId: string,
    service: FindingService,
  ): Promise<AnalyticsResource[]> {
    const latestScan = await this.getLatestScan(userId);

    if (!latestScan) {
      return [];
    }

    const findings = await this.findingsRepository.find({
      where: { scan: { id: latestScan.id }, service },
      order: { createdAt: 'DESC' },
    });
    const seen = new Set<string>();

    return findings
      .filter((finding) => {
        if (seen.has(finding.resourceId)) {
          return false;
        }

        seen.add(finding.resourceId);
        return true;
      })
      .map((finding) => ({
        id: finding.resourceId,
        name: finding.resourceName ?? finding.resourceId,
        service: finding.service,
        metadata: finding.metadata,
      }));
  }

  async getMetrics(
    userId: string,
    service: FindingService,
    resourceId: string,
    range: AnalyticsRange,
  ) {
    const latestScan = await this.getLatestScanWithAccount(userId);

    if (!latestScan?.awsAccount) {
      throw new NotFoundException('Run a scan before requesting analytics.');
    }

    const resource = await this.findResourceInLatestScan(
      latestScan.id,
      service,
      resourceId,
    );

    if (!resource) {
      throw new NotFoundException(
        `Resource "${resourceId}" was not found in the latest scan.`,
      );
    }

    const account = {
      ...latestScan.awsAccount,
      secretAccessKey: this.encryptionService.decrypt(
        latestScan.awsAccount.secretAccessKey,
      ),
    };
    const period = this.getPeriod();
    const { startTime, endTime } = this.getTimeWindow(range);
    const [cloudWatchPoints, costPoints] = await Promise.all([
      this.getCloudWatchPoints(account, resource, startTime, endTime, period),
      this.getCostPoints(account, service, startTime, endTime),
    ]);

    return {
      service,
      resourceId,
      resourceName: resource.resourceName ?? resource.resourceId,
      range,
      source: {
        cost: 'aws-cost-explorer-service-level',
        metrics: 'aws-cloudwatch-resource-level',
      },
      points: this.mergePoints(cloudWatchPoints, costPoints),
    };
  }

  private async getCloudWatchPoints(
    account: AwsAccount,
    resource: ResourceFinding,
    startTime: Date,
    endTime: Date,
    period: number,
  ): Promise<MetricPoint[]> {
    const queries = this.getMetricQueries(resource, period);

    if (queries.length === 0) {
      return this.emptyPoints(startTime, endTime, period);
    }

    const client = new CloudWatchClient({
      region: account.region,
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
      },
    });

    try {
      const response = await client.send(
        new GetMetricDataCommand({
          StartTime: startTime,
          EndTime: endTime,
          MetricDataQueries: queries,
        }),
      );

      return this.toMetricPoints(response.MetricDataResults ?? []);
    } catch {
      return this.emptyPoints(startTime, endTime, period);
    }
  }

  private async getCostPoints(
    account: AwsAccount,
    service: FindingService,
    startTime: Date,
    endTime: Date,
  ): Promise<Array<{ label: string; cost: number }>> {
    const client = new CostExplorerClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
      },
    });

    try {
      const response = await client.send(
        new GetCostAndUsageCommand({
          TimePeriod: {
            Start: this.toDateOnly(startTime),
            End: this.toDateOnly(endTime),
          },
          Granularity: 'DAILY',
          Metrics: ['UnblendedCost'],
          Filter: {
            Dimensions: {
              Key: 'SERVICE',
              Values: [this.toCostExplorerServiceName(service)],
            },
          },
        }),
      );

      return (response.ResultsByTime ?? []).map((result) => ({
        label: result.TimePeriod?.Start ?? '',
        cost: Number(result.Total?.UnblendedCost?.Amount ?? 0),
      }));
    } catch {
      return [];
    }
  }

  private getMetricQueries(
    resource: ResourceFinding,
    period: number,
  ): MetricDataQuery[] {
    const id = this.safeId(resource.service.toLowerCase());

    if (resource.service === FindingService.EC2) {
      return [
        this.metricQuery(
          `${id}cpu`,
          'AWS/EC2',
          'CPUUtilization',
          'Percent',
          period,
          [{ Name: 'InstanceId', Value: resource.resourceId }],
        ),
        this.metricQuery(`${id}net`, 'AWS/EC2', 'NetworkIn', 'Bytes', period, [
          { Name: 'InstanceId', Value: resource.resourceId },
        ]),
        this.metricQuery(
          `${id}mem`,
          'CWAgent',
          'mem_used_percent',
          'Percent',
          period,
          [{ Name: 'InstanceId', Value: resource.resourceId }],
        ),
      ];
    }

    if (resource.service === FindingService.ECS) {
      const metadata = resource.metadata ?? {};
      const clusterName = this.getNameFromArn(
        this.getMetadataString(metadata, 'clusterArn'),
      );
      const serviceName =
        this.getMetadataString(metadata, 'serviceName') ||
        this.getNameFromArn(resource.resourceId);

      return [
        this.metricQuery(
          `${id}cpu`,
          'AWS/ECS',
          'CPUUtilization',
          'Percent',
          period,
          [
            { Name: 'ClusterName', Value: clusterName },
            { Name: 'ServiceName', Value: serviceName },
          ],
        ),
        this.metricQuery(
          `${id}mem`,
          'AWS/ECS',
          'MemoryUtilization',
          'Percent',
          period,
          [
            { Name: 'ClusterName', Value: clusterName },
            { Name: 'ServiceName', Value: serviceName },
          ],
        ),
      ];
    }

    if (resource.service === FindingService.RDS) {
      return [
        this.metricQuery(
          `${id}cpu`,
          'AWS/RDS',
          'CPUUtilization',
          'Percent',
          period,
          [{ Name: 'DBInstanceIdentifier', Value: resource.resourceId }],
        ),
        this.metricQuery(
          `${id}mem`,
          'AWS/RDS',
          'FreeableMemory',
          'Bytes',
          period,
          [{ Name: 'DBInstanceIdentifier', Value: resource.resourceId }],
        ),
        this.metricQuery(
          `${id}net`,
          'AWS/RDS',
          'NetworkReceiveThroughput',
          'Bytes/Second',
          period,
          [{ Name: 'DBInstanceIdentifier', Value: resource.resourceId }],
        ),
      ];
    }

    if (resource.service === FindingService.S3) {
      return [
        this.metricQuery(
          `${id}storage`,
          'AWS/S3',
          'BucketSizeBytes',
          'Bytes',
          period,
          [
            { Name: 'BucketName', Value: resource.resourceId },
            { Name: 'StorageType', Value: 'StandardStorage' },
          ],
        ),
        this.metricQuery(
          `${id}objects`,
          'AWS/S3',
          'NumberOfObjects',
          'Count',
          period,
          [
            { Name: 'BucketName', Value: resource.resourceId },
            { Name: 'StorageType', Value: 'AllStorageTypes' },
          ],
        ),
      ];
    }

    if (resource.service === FindingService.EBS) {
      return [
        this.metricQuery(
          `${id}read`,
          'AWS/EBS',
          'VolumeReadOps',
          'Count',
          period,
          [{ Name: 'VolumeId', Value: resource.resourceId }],
        ),
        this.metricQuery(
          `${id}write`,
          'AWS/EBS',
          'VolumeWriteOps',
          'Count',
          period,
          [{ Name: 'VolumeId', Value: resource.resourceId }],
        ),
      ];
    }

    return [];
  }

  private metricQuery(
    id: string,
    namespace: string,
    metricName: string,
    unit: StandardUnit,
    period: number,
    dimensions: Array<{ Name: string; Value: string }>,
  ): MetricDataQuery {
    return {
      Id: id,
      MetricStat: {
        Period: period,
        Stat: 'Average',
        Unit: unit,
        Metric: {
          Namespace: namespace,
          MetricName: metricName,
          Dimensions: dimensions,
        },
      },
      ReturnData: true,
    };
  }

  private toMetricPoints(results: MetricDataResult[]): MetricPoint[] {
    const pointMap = new Map<string, MetricPoint>();

    for (const result of results) {
      result.Timestamps?.forEach((timestamp, index) => {
        const label = this.toPointLabel(timestamp);
        const point =
          pointMap.get(label) ??
          ({
            label,
            cost: null,
            cpu: null,
            memory: null,
            network: null,
          } satisfies MetricPoint);
        const value = result.Values?.[index] ?? null;

        if (result.Id?.includes('cpu')) {
          point.cpu = value;
        } else if (result.Id?.includes('mem')) {
          point.memory = value;
        } else if (
          result.Id?.includes('net') ||
          result.Id?.includes('storage') ||
          result.Id?.includes('read') ||
          result.Id?.includes('write') ||
          result.Id?.includes('objects')
        ) {
          point.network = value;
        }

        pointMap.set(label, point);
      });
    }

    return [...pointMap.values()].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }

  private mergePoints(
    metricPoints: MetricPoint[],
    costPoints: Array<{ label: string; cost: number }>,
  ): MetricPoint[] {
    const pointMap = new Map(metricPoints.map((point) => [point.label, point]));

    for (const costPoint of costPoints) {
      const point =
        pointMap.get(costPoint.label) ??
        ({
          label: costPoint.label,
          cost: null,
          cpu: null,
          memory: null,
          network: null,
        } satisfies MetricPoint);
      point.cost = costPoint.cost;
      pointMap.set(costPoint.label, point);
    }

    return [...pointMap.values()].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }

  private async getLatestScan(userId: string): Promise<Scan | null> {
    return this.scansRepository
      .createQueryBuilder('scan')
      .innerJoin('scan.awsAccount', 'awsAccount')
      .innerJoin('awsAccount.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('scan.createdAt', 'DESC')
      .getOne();
  }

  private async getLatestScanWithAccount(userId: string): Promise<Scan | null> {
    return this.scansRepository
      .createQueryBuilder('scan')
      .leftJoinAndSelect('scan.awsAccount', 'awsAccount')
      .innerJoin('awsAccount.user', 'user')
      .addSelect('awsAccount.secretAccessKey')
      .where('user.id = :userId', { userId })
      .orderBy('scan.createdAt', 'DESC')
      .getOne();
  }

  private async findResourceInLatestScan(
    scanId: string,
    service: FindingService,
    resourceId: string,
  ): Promise<ResourceFinding | null> {
    return this.findingsRepository.findOne({
      where: {
        scan: { id: scanId },
        service,
        resourceId,
      },
    });
  }

  private getTimeWindow(range: AnalyticsRange) {
    const endTime = new Date();
    const startTime = new Date(endTime);
    startTime.setDate(endTime.getDate() - (range === 'weekly' ? 7 : 30));

    return { startTime, endTime };
  }

  private getPeriod() {
    return 86_400;
  }

  private emptyPoints(startTime: Date, endTime: Date, period: number) {
    const points: MetricPoint[] = [];
    const cursor = new Date(startTime);

    while (cursor <= endTime) {
      points.push({
        label: this.toPointLabel(cursor),
        cost: null,
        cpu: null,
        memory: null,
        network: null,
      });
      cursor.setSeconds(cursor.getSeconds() + period);
    }

    return points;
  }

  private toPointLabel(date: Date) {
    return this.toDateOnly(date);
  }

  private toDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private safeId(value: string) {
    return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
  }

  private getNameFromArn(arn: string) {
    return arn.split('/').at(-1) ?? arn;
  }

  private getMetadataString(
    metadata: Record<string, unknown>,
    key: string,
  ): string {
    const value = metadata[key];

    return typeof value === 'string' ? value : '';
  }

  private toCostExplorerServiceName(service: FindingService) {
    const names: Record<FindingService, string> = {
      [FindingService.EC2]: 'Amazon Elastic Compute Cloud - Compute',
      [FindingService.EBS]: 'Amazon Elastic Block Store',
      [FindingService.S3]: 'Amazon Simple Storage Service',
      [FindingService.RDS]: 'Amazon Relational Database Service',
      [FindingService.ECS]: 'Amazon Elastic Container Service',
    };

    return names[service];
  }
}
