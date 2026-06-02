import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsAccount } from '../aws-accounts/aws-account.entity';
import { AwsScannerModule } from '../aws-scanner/aws-scanner.module';
import { ResourceFinding } from '../findings/resource-finding.entity';
import { Scan } from '../scans/scan.entity';
import { SecurityModule } from '../security/security.module';
import { SCAN_QUEUE_NAME } from './scan-queue.constants';
import { ScanQueueService } from './scan-queue.service';
import { ScanProcessor } from './scan.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    BullModule.registerQueue({
      name: SCAN_QUEUE_NAME,
    }),
    TypeOrmModule.forFeature([Scan, AwsAccount, ResourceFinding]),
    AwsScannerModule,
    SecurityModule,
  ],
  providers: [ScanQueueService, ScanProcessor],
  exports: [ScanQueueService],
})
export class ScanQueueModule {}
