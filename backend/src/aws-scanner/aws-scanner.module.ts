import { Module } from '@nestjs/common';
import { RecommendationModule } from '../recommendations/recommendation.module';
import { AwsScannerService } from './aws-scanner.service';
import { EbsScanner } from './scanners/ebs.scanner';
import { Ec2Scanner } from './scanners/ec2.scanner';
import { EcsScanner } from './scanners/ecs.scanner';
import { RdsScanner } from './scanners/rds.scanner';
import { S3Scanner } from './scanners/s3.scanner';

@Module({
  imports: [RecommendationModule],
  providers: [
    AwsScannerService,
    EbsScanner,
    Ec2Scanner,
    EcsScanner,
    S3Scanner,
    RdsScanner,
  ],
  exports: [AwsScannerService],
})
export class AwsScannerModule {}
