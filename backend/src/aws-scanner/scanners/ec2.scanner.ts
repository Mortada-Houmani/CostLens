import {
  DescribeInstancesCommand,
  EC2Client,
  Instance,
} from '@aws-sdk/client-ec2';
import { Injectable } from '@nestjs/common';
import { AwsAccount } from '../../aws-accounts/aws-account.entity';
import { RecommendationService } from '../../recommendations/recommendation.service';
import { RecommendationType } from '../../recommendations/rules';
import { Finding } from '../interfaces/finding.interface';

@Injectable()
export class Ec2Scanner {
  constructor(private readonly recommendationService: RecommendationService) {}

  async scan(account: AwsAccount): Promise<Finding[]> {
    const client = new EC2Client({
      region: account.region,
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
      },
    });

    const instances = await this.getInstances(client);

    return instances.flatMap((instance) =>
      this.toInstanceFindings(instance, account.region),
    );
  }

  private async getInstances(client: EC2Client): Promise<Instance[]> {
    const instances: Instance[] = [];
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new DescribeInstancesCommand({
          NextToken: nextToken,
        }),
      );

      for (const reservation of response.Reservations ?? []) {
        instances.push(...(reservation.Instances ?? []));
      }

      nextToken = response.NextToken;
    } while (nextToken);

    return instances;
  }

  private toInstanceFindings(instance: Instance, region: string): Finding[] {
    if (!instance.InstanceId) {
      return [];
    }

    const findings: Finding[] = [];
    const state = instance.State?.Name;

    if (instance.PublicIpAddress) {
      findings.push(this.toFinding(instance, region, 'PUBLIC_EC2_INSTANCE'));
    }

    if (state === 'running') {
      findings.push(this.toFinding(instance, region, 'RUNNING_INSTANCE'));
    }

    if (state === 'stopped') {
      findings.push(this.toFinding(instance, region, 'STOPPED_INSTANCE'));
    }

    return findings;
  }

  private toFinding(
    instance: Instance,
    region: string,
    type: RecommendationType,
  ): Finding {
    const recommendation = this.recommendationService.build(type, {
      resourceId: instance.InstanceId,
      region,
    });

    return {
      service: 'EC2',
      resourceId: instance.InstanceId ?? 'unknown',
      resourceName: this.getNameTag(instance),
      region,
      severity: recommendation.severity,
      type: recommendation.type,
      message: recommendation.message,
      recommendation: recommendation.recommendation,
      fixCommand: recommendation.fixCommand,
      metadata: this.toMetadata(instance),
    };
  }

  private toMetadata(instance: Instance): Record<string, any> {
    return {
      instanceId: instance.InstanceId,
      instanceType: instance.InstanceType,
      state: instance.State?.Name,
      publicIpAddress: instance.PublicIpAddress,
      privateIpAddress: instance.PrivateIpAddress,
      launchTime: instance.LaunchTime?.toISOString(),
      tags: instance.Tags,
      availabilityZone: instance.Placement?.AvailabilityZone,
    };
  }

  private getNameTag(instance: Instance): string | undefined {
    return instance.Tags?.find((tag) => tag.Key === 'Name')?.Value;
  }
}
