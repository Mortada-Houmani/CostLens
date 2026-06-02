export type FindingService = 'EC2' | 'EBS' | 'S3' | 'RDS' | 'ECS';
export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Finding {
  service: FindingService;
  resourceId: string;
  resourceName?: string;
  region: string;
  severity: FindingSeverity;
  type: string;
  message: string;
  estimatedMonthlyWaste?: number;
  recommendation: string;
  fixCommand?: string;
  metadata?: Record<string, any>;
}
