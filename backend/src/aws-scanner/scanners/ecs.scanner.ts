import {
  DescribeServicesCommand,
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  Service,
} from '@aws-sdk/client-ecs';
import { Injectable } from '@nestjs/common';
import { AwsAccount } from '../../aws-accounts/aws-account.entity';
import { RecommendationService } from '../../recommendations/recommendation.service';
import { RecommendationType } from '../../recommendations/rules';
import { Finding } from '../interfaces/finding.interface';

@Injectable()
export class EcsScanner {
  constructor(private readonly recommendationService: RecommendationService) {}

  async scan(account: AwsAccount): Promise<Finding[]> {
    const client = new ECSClient({
      region: account.region,
      credentials: {
        accessKeyId: account.accessKeyId,
        secretAccessKey: account.secretAccessKey,
      },
    });

    const clusterArns = await this.getClusterArns(client);
    const findings: Finding[] = [];

    for (const clusterArn of clusterArns) {
      const services = await this.getServices(client, clusterArn);

      findings.push(
        ...services.flatMap((service) =>
          this.toServiceFindings(service, clusterArn, account.region),
        ),
      );
    }

    return findings;
  }

  private async getClusterArns(client: ECSClient): Promise<string[]> {
    const clusterArns: string[] = [];
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListClustersCommand({
          nextToken,
        }),
      );

      clusterArns.push(...(response.clusterArns ?? []));
      nextToken = response.nextToken;
    } while (nextToken);

    return clusterArns;
  }

  private async getServices(
    client: ECSClient,
    clusterArn: string,
  ): Promise<Service[]> {
    const serviceArns: string[] = [];
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListServicesCommand({
          cluster: clusterArn,
          nextToken,
        }),
      );

      serviceArns.push(...(response.serviceArns ?? []));
      nextToken = response.nextToken;
    } while (nextToken);

    const services: Service[] = [];

    for (let index = 0; index < serviceArns.length; index += 10) {
      const serviceBatch = serviceArns.slice(index, index + 10);
      const response = await client.send(
        new DescribeServicesCommand({
          cluster: clusterArn,
          services: serviceBatch,
        }),
      );

      services.push(...(response.services ?? []));
    }

    return services;
  }

  private toServiceFindings(
    service: Service,
    clusterArn: string,
    region: string,
  ): Finding[] {
    if (!service.serviceArn) {
      return [];
    }

    const findings: Finding[] = [];
    const assignPublicIp =
      service.networkConfiguration?.awsvpcConfiguration?.assignPublicIp;

    if (assignPublicIp === 'ENABLED') {
      findings.push(
        this.toFinding(
          service,
          clusterArn,
          region,
          'ECS_SERVICE_PUBLIC_IP_ENABLED',
        ),
      );
    }

    if (
      (service.desiredCount ?? 0) > (service.runningCount ?? 0) ||
      (service.pendingCount ?? 0) > 0
    ) {
      findings.push(
        this.toFinding(service, clusterArn, region, 'ECS_SERVICE_NOT_STABLE'),
      );
    }

    if ((service.runningCount ?? 0) > 0) {
      findings.push(
        this.toFinding(service, clusterArn, region, 'ECS_SERVICE_RUNNING'),
      );
    }

    return findings;
  }

  private toFinding(
    service: Service,
    clusterArn: string,
    region: string,
    type: RecommendationType,
  ): Finding {
    const recommendation = this.recommendationService.build(type, {
      resourceId: service.serviceArn,
      region,
    });

    return {
      service: 'ECS',
      resourceId: service.serviceArn ?? 'unknown',
      resourceName: service.serviceName,
      region,
      severity: recommendation.severity,
      type: recommendation.type,
      message: recommendation.message,
      recommendation: recommendation.recommendation,
      fixCommand: recommendation.fixCommand,
      metadata: this.toMetadata(service, clusterArn),
    };
  }

  private toMetadata(
    service: Service,
    clusterArn: string,
  ): Record<string, any> {
    return {
      clusterArn,
      serviceArn: service.serviceArn,
      serviceName: service.serviceName,
      status: service.status,
      desiredCount: service.desiredCount,
      runningCount: service.runningCount,
      pendingCount: service.pendingCount,
      launchType: service.launchType,
      taskDefinition: service.taskDefinition,
      deploymentConfiguration: service.deploymentConfiguration,
      assignPublicIp:
        service.networkConfiguration?.awsvpcConfiguration?.assignPublicIp,
      subnets: service.networkConfiguration?.awsvpcConfiguration?.subnets,
      securityGroups:
        service.networkConfiguration?.awsvpcConfiguration?.securityGroups,
    };
  }
}
