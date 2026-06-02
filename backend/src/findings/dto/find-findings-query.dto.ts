import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { FindingService, FindingSeverity } from '../resource-finding.entity';

export class FindFindingsQueryDto {
  @IsOptional()
  @IsUUID()
  scanId?: string;

  @IsOptional()
  @IsEnum(FindingService)
  service?: FindingService;

  @IsOptional()
  @IsEnum(FindingSeverity)
  severity?: FindingSeverity;
}
