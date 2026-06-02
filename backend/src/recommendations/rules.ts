import { FindingSeverity } from '../aws-scanner/interfaces/finding.interface';

export type RecommendationType =
  | 'UNATTACHED_VOLUME'
  | 'PUBLIC_EC2_INSTANCE'
  | 'RUNNING_INSTANCE'
  | 'STOPPED_INSTANCE'
  | 'S3_PUBLIC_ACCESS_NOT_FULLY_BLOCKED'
  | 'S3_ENCRYPTION_DISABLED'
  | 'S3_VERSIONING_DISABLED'
  | 'PUBLIC_RDS_INSTANCE'
  | 'RDS_BACKUPS_DISABLED'
  | 'RDS_ENCRYPTION_DISABLED'
  | 'ECS_SERVICE_PUBLIC_IP_ENABLED'
  | 'ECS_SERVICE_NOT_STABLE'
  | 'ECS_SERVICE_RUNNING';

export interface RecommendationContext {
  resourceId?: string;
  region?: string;
}

export interface RecommendationRule {
  type: RecommendationType;
  severity: FindingSeverity;
  buildMessage: (context: RecommendationContext) => string;
  buildRecommendation: (context: RecommendationContext) => string;
  buildFixCommand?: (context: RecommendationContext) => string | undefined;
}

export const recommendationRules: Record<
  RecommendationType,
  RecommendationRule
> = {
  UNATTACHED_VOLUME: {
    type: 'UNATTACHED_VOLUME',
    severity: 'MEDIUM',
    buildMessage: () => 'Unattached EBS volume detected',
    buildRecommendation: () =>
      'Delete this volume if you confirmed it is unused, or attach it to an instance if still needed.',
    buildFixCommand: ({ resourceId, region }) =>
      resourceId && region
        ? `aws ec2 delete-volume --volume-id ${resourceId} --region ${region}`
        : undefined,
  },
  PUBLIC_EC2_INSTANCE: {
    type: 'PUBLIC_EC2_INSTANCE',
    severity: 'MEDIUM',
    buildMessage: () => 'EC2 instance has a public IP address',
    buildRecommendation: () =>
      'Review whether this instance needs a public IP. Prefer private subnets behind a load balancer when possible.',
  },
  RUNNING_INSTANCE: {
    type: 'RUNNING_INSTANCE',
    severity: 'LOW',
    buildMessage: () => 'EC2 instance is running',
    buildRecommendation: () => 'Confirm this running instance is still needed.',
  },
  STOPPED_INSTANCE: {
    type: 'STOPPED_INSTANCE',
    severity: 'LOW',
    buildMessage: () => 'EC2 instance is stopped',
    buildRecommendation: () =>
      'Stopped instances do not charge for compute, but attached EBS volumes may still cost money.',
  },
  S3_PUBLIC_ACCESS_NOT_FULLY_BLOCKED: {
    type: 'S3_PUBLIC_ACCESS_NOT_FULLY_BLOCKED',
    severity: 'HIGH',
    buildMessage: () => 'S3 bucket does not fully block public access',
    buildRecommendation: () =>
      'Enable S3 Block Public Access unless this bucket is intentionally public.',
    buildFixCommand: ({ resourceId }) =>
      resourceId
        ? `aws s3api put-public-access-block --bucket ${resourceId} --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`
        : undefined,
  },
  S3_ENCRYPTION_DISABLED: {
    type: 'S3_ENCRYPTION_DISABLED',
    severity: 'MEDIUM',
    buildMessage: () => 'S3 bucket default encryption is disabled',
    buildRecommendation: () =>
      'Enable default server-side encryption for this bucket.',
  },
  S3_VERSIONING_DISABLED: {
    type: 'S3_VERSIONING_DISABLED',
    severity: 'LOW',
    buildMessage: () => 'S3 bucket versioning is disabled',
    buildRecommendation: () =>
      'Enable versioning for important buckets to protect against accidental deletion.',
  },
  PUBLIC_RDS_INSTANCE: {
    type: 'PUBLIC_RDS_INSTANCE',
    severity: 'HIGH',
    buildMessage: () => 'RDS database is publicly accessible',
    buildRecommendation: () =>
      'Move the database into private subnets or strictly restrict inbound access.',
  },
  RDS_BACKUPS_DISABLED: {
    type: 'RDS_BACKUPS_DISABLED',
    severity: 'HIGH',
    buildMessage: () => 'RDS automated backups are disabled',
    buildRecommendation: () =>
      'Enable automated backups to protect against data loss.',
  },
  RDS_ENCRYPTION_DISABLED: {
    type: 'RDS_ENCRYPTION_DISABLED',
    severity: 'MEDIUM',
    buildMessage: () => 'RDS storage encryption is disabled',
    buildRecommendation: () =>
      'Enable encryption at rest for database storage.',
  },
  ECS_SERVICE_PUBLIC_IP_ENABLED: {
    type: 'ECS_SERVICE_PUBLIC_IP_ENABLED',
    severity: 'MEDIUM',
    buildMessage: () => 'ECS service assigns public IP addresses',
    buildRecommendation: () =>
      'Review whether this ECS service needs public IPs. Prefer private subnets behind a load balancer when possible.',
  },
  ECS_SERVICE_NOT_STABLE: {
    type: 'ECS_SERVICE_NOT_STABLE',
    severity: 'MEDIUM',
    buildMessage: () => 'ECS service is not at desired capacity',
    buildRecommendation: () =>
      'Review service events, task health, and deployment status to confirm the service can reach its desired running count.',
  },
  ECS_SERVICE_RUNNING: {
    type: 'ECS_SERVICE_RUNNING',
    severity: 'LOW',
    buildMessage: () => 'ECS service is running tasks',
    buildRecommendation: () =>
      'Confirm this ECS service is still needed and sized appropriately for current usage.',
  },
};
