import { DescribeVolumesCommand, EC2Client, Volume } from '@aws-sdk/client-ec2';
import { Injectable } from '@nestjs/common';
import { AwsAccount } from '../../aws-accounts/aws-account.entity';
import { RecommendationService } from '../../recommendations/recommendation.service';
import { Finding } from '../interfaces/finding.interface';

@Injectable()
export class EbsScanner {
  constructor(private readonly recommendationService: RecommendationService) {}

  async scan(account: AwsAccount): Promise<Finding[]> {
    const client = new EC2Client({
      region: account.region,
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
      },
    });

    const volumes = await this.getVolumes(client);

    return volumes
      .filter((volume) => volume.State === 'available' && volume.VolumeId)
      .map((volume) => this.toUnattachedVolumeFinding(volume, account.region));
  }

  private async getVolumes(client: EC2Client): Promise<Volume[]> {
    const volumes: Volume[] = [];
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new DescribeVolumesCommand({
          NextToken: nextToken,
        }),
      );

      volumes.push(...(response.Volumes ?? []));
      nextToken = response.NextToken;
    } while (nextToken);

    return volumes;
  }

  private toUnattachedVolumeFinding(volume: Volume, region: string): Finding {
    const sizeInGb = volume.Size ?? 0;
    const recommendation = this.recommendationService.build(
      'UNATTACHED_VOLUME',
      {
        resourceId: volume.VolumeId,
        region,
      },
    );

    return {
      service: 'EBS',
      resourceId: volume.VolumeId ?? 'unknown',
      resourceName: this.getNameTag(volume),
      region,
      severity: recommendation.severity,
      type: recommendation.type,
      message: recommendation.message,
      estimatedMonthlyWaste: this.estimateMonthlyWaste(sizeInGb),
      recommendation: recommendation.recommendation,
      fixCommand: recommendation.fixCommand,
      metadata: {
        volumeId: volume.VolumeId,
        size: volume.Size,
        volumeType: volume.VolumeType,
        state: volume.State,
        availabilityZone: volume.AvailabilityZone,
        createTime: volume.CreateTime?.toISOString(),
      },
    };
  }

  private getNameTag(volume: Volume): string | undefined {
    return volume.Tags?.find((tag) => tag.Key === 'Name')?.Value;
  }

  private estimateMonthlyWaste(sizeInGiB: number): number {
    const monthlyPricePerGb = 0.1;

    return Number((sizeInGiB * monthlyPricePerGb).toFixed(2));
  }
}
