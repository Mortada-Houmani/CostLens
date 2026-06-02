import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsAccount } from '../aws-accounts/aws-account.entity';
import { ResourceFinding } from '../findings/resource-finding.entity';
import { Scan } from '../scans/scan.entity';
import { SecurityModule } from '../security/security.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AwsAccount, ResourceFinding, Scan]),
    SecurityModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
