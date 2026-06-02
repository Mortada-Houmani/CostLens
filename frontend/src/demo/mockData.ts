export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const now = new Date()
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()

export const mockAwsAccounts = [
  {
    id: 'demo-account-production',
    accountName: 'Production Core',
    accessKeyId: 'AKIADMO123456789',
    region: 'us-east-1',
    createdAt: hoursAgo(96),
    user: {
      email: 'demo@costlens.dev',
    },
  },
  {
    id: 'demo-account-data',
    accountName: 'Data Platform',
    accessKeyId: 'AKIADMO987654321',
    region: 'us-west-2',
    createdAt: hoursAgo(72),
    user: {
      email: 'platform@costlens.dev',
    },
  },
]

export const mockScans = [
  {
    id: 'demo-scan-003',
    status: 'success',
    findingsCount: 6,
    createdAt: hoursAgo(2),
    startedAt: hoursAgo(2),
    finishedAt: hoursAgo(1.9),
    errorMessage: null,
  },
  {
    id: 'demo-scan-002',
    status: 'success',
    findingsCount: 4,
    createdAt: hoursAgo(28),
    startedAt: hoursAgo(28),
    finishedAt: hoursAgo(27.9),
    errorMessage: null,
  },
  {
    id: 'demo-scan-001',
    status: 'failed',
    findingsCount: 0,
    createdAt: hoursAgo(52),
    startedAt: hoursAgo(52),
    finishedAt: hoursAgo(51.95),
    errorMessage: 'Demo scan failed because temporary AWS credentials expired.',
  },
]

export const mockFindings = [
  {
    id: 'demo-finding-s3-public',
    service: 'S3',
    resourceId: 'costlens-demo-public-assets',
    resourceName: 'Public Assets Bucket',
    region: 'us-east-1',
    severity: 'HIGH',
    type: 'S3_PUBLIC_ACCESS_NOT_FULLY_BLOCKED',
    message: 'S3 bucket does not fully block public access',
    estimatedMonthlyWaste: '0',
    recommendation:
      'Enable S3 Block Public Access unless this bucket is intentionally public.',
    fixCommand:
      'aws s3api put-public-access-block --bucket costlens-demo-public-assets --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true',
    metadata: {
      bucketName: 'costlens-demo-public-assets',
      publicAccessBlock: {
        BlockPublicAcls: false,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: false,
      },
    },
    createdAt: hoursAgo(2),
    scan: {
      id: 'demo-scan-003',
      status: 'success',
    },
  },
  {
    id: 'demo-finding-rds-public',
    service: 'RDS',
    resourceId: 'costlens-demo-orders-db',
    resourceName: 'orders-primary',
    region: 'us-east-1',
    severity: 'HIGH',
    type: 'PUBLIC_RDS_INSTANCE',
    message: 'RDS database is publicly accessible',
    estimatedMonthlyWaste: '0',
    recommendation:
      'Move the database into private subnets or strictly restrict inbound access.',
    fixCommand: null,
    metadata: {
      engine: 'postgres',
      publiclyAccessible: true,
      backupRetentionPeriod: 7,
    },
    createdAt: hoursAgo(2.1),
    scan: {
      id: 'demo-scan-003',
      status: 'success',
    },
  },
  {
    id: 'demo-finding-ebs-unattached',
    service: 'EBS',
    resourceId: 'vol-0demo123456789abc',
    resourceName: 'orphaned-build-cache',
    region: 'us-west-2',
    severity: 'MEDIUM',
    type: 'UNATTACHED_VOLUME',
    message: 'Unattached EBS volume detected',
    estimatedMonthlyWaste: '12.80',
    recommendation:
      'Delete this volume if you confirmed it is unused, or attach it to an instance if still needed.',
    fixCommand:
      'aws ec2 delete-volume --volume-id vol-0demo123456789abc --region us-west-2',
    metadata: {
      volumeId: 'vol-0demo123456789abc',
      size: 128,
      volumeType: 'gp3',
      state: 'available',
    },
    createdAt: hoursAgo(2.2),
    scan: {
      id: 'demo-scan-003',
      status: 'success',
    },
  },
  {
    id: 'demo-finding-ec2-public',
    service: 'EC2',
    resourceId: 'i-0demo123456789def',
    resourceName: 'legacy-admin-host',
    region: 'us-east-1',
    severity: 'MEDIUM',
    type: 'PUBLIC_EC2_INSTANCE',
    message: 'EC2 instance has a public IP address',
    estimatedMonthlyWaste: '0',
    recommendation:
      'Review whether this instance needs a public IP. Prefer private subnets behind a load balancer when possible.',
    fixCommand: null,
    metadata: {
      instanceType: 't3.medium',
      state: 'running',
      publicIpAddress: '203.0.113.24',
    },
    createdAt: hoursAgo(2.4),
    scan: {
      id: 'demo-scan-003',
      status: 'success',
    },
  },
  {
    id: 'demo-finding-s3-versioning',
    service: 'S3',
    resourceId: 'costlens-demo-logs',
    resourceName: 'Logs Archive',
    region: 'us-east-1',
    severity: 'LOW',
    type: 'S3_VERSIONING_DISABLED',
    message: 'S3 bucket versioning is disabled',
    estimatedMonthlyWaste: '0',
    recommendation:
      'Enable versioning for important buckets to protect against accidental deletion.',
    fixCommand: null,
    metadata: {
      bucketName: 'costlens-demo-logs',
      versioning: {
        Status: 'Suspended',
      },
    },
    createdAt: hoursAgo(2.6),
    scan: {
      id: 'demo-scan-003',
      status: 'success',
    },
  },
  {
    id: 'demo-finding-ec2-running',
    service: 'EC2',
    resourceId: 'i-0demo987654321fed',
    resourceName: 'nightly-test-runner',
    region: 'us-west-2',
    severity: 'LOW',
    type: 'RUNNING_INSTANCE',
    message: 'EC2 instance is running',
    estimatedMonthlyWaste: '34.50',
    recommendation: 'Confirm this running instance is still needed.',
    fixCommand: null,
    metadata: {
      instanceType: 't3.large',
      state: 'running',
    },
    createdAt: hoursAgo(3),
    scan: {
      id: 'demo-scan-003',
      status: 'success',
    },
  },
  {
    id: 'demo-finding-ecs-public-ip',
    service: 'ECS',
    resourceId:
      'arn:aws:ecs:eu-central-1:123456789012:service/costlens-cluster/costlens-backend-service',
    resourceName: 'costlens-backend-service',
    region: 'eu-central-1',
    severity: 'MEDIUM',
    type: 'ECS_SERVICE_PUBLIC_IP_ENABLED',
    message: 'ECS service assigns public IP addresses',
    estimatedMonthlyWaste: '0',
    recommendation:
      'Review whether this ECS service needs public IPs. Prefer private subnets behind a load balancer when possible.',
    fixCommand: null,
    metadata: {
      clusterArn:
        'arn:aws:ecs:eu-central-1:123456789012:cluster/costlens-cluster',
      runningCount: 1,
      desiredCount: 1,
      assignPublicIp: 'ENABLED',
    },
    createdAt: hoursAgo(3.2),
    scan: {
      id: 'demo-scan-003',
      status: 'success',
    },
  },
]

export const mockDashboardSummary = {
  totalFindings: mockFindings.length,
  highSeverity: mockFindings.filter((finding) => finding.severity === 'HIGH')
    .length,
  mediumSeverity: mockFindings.filter(
    (finding) => finding.severity === 'MEDIUM',
  ).length,
  lowSeverity: mockFindings.filter((finding) => finding.severity === 'LOW')
    .length,
  estimatedMonthlyWaste: mockFindings.reduce(
    (total, finding) => total + Number(finding.estimatedMonthlyWaste ?? 0),
    0,
  ),
  findingsByService: {
    EC2: mockFindings.filter((finding) => finding.service === 'EC2').length,
    EBS: mockFindings.filter((finding) => finding.service === 'EBS').length,
    S3: mockFindings.filter((finding) => finding.service === 'S3').length,
    RDS: mockFindings.filter((finding) => finding.service === 'RDS').length,
    ECS: mockFindings.filter((finding) => finding.service === 'ECS').length,
  },
  latestScan: {
    id: mockScans[0].id,
    status: mockScans[0].status,
    startedAt: mockScans[0].startedAt,
    finishedAt: mockScans[0].finishedAt,
  },
  totalScans: mockScans.length,
  failedScans: mockScans.filter((scan) => scan.status === 'failed').length,
  successfulScans: mockScans.filter((scan) => scan.status === 'success').length,
  latestFindings: mockFindings.slice(0, 5).map((finding) => ({
    id: finding.id,
    service: finding.service,
    resourceId: finding.resourceId,
    resourceName: finding.resourceName,
    region: finding.region,
    severity: finding.severity,
    type: finding.type,
    estimatedMonthlyWaste: finding.estimatedMonthlyWaste,
    createdAt: finding.createdAt,
    scan: finding.scan,
  })),
}
