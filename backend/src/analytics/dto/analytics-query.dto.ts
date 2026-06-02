import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { FindingService } from '../../findings/resource-finding.entity';

export class AnalyticsResourcesQueryDto {
  @IsEnum(FindingService)
  service: FindingService;
}

export class AnalyticsMetricsQueryDto {
  @IsEnum(FindingService)
  service: FindingService;

  @IsString()
  resourceId: string;

  @IsOptional()
  @IsIn(['weekly', 'monthly'])
  range?: 'weekly' | 'monthly';
}
