import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import 'dotenv/config';
import { AwsAccount } from '../aws-accounts/aws-account.entity';
import { AwsScannerModule } from '../aws-scanner/aws-scanner.module';
import { ResourceFinding } from '../findings/resource-finding.entity';
import { Scan } from '../scans/scan.entity';
import { SecurityModule } from '../security/security.module';
import { SCAN_QUEUE_NAME } from './scan-queue.constants';
import { ScanExecutorService } from './scan-executor.service';
import { ScanQueueService } from './scan-queue.service';
import { ScanProcessor } from './scan.processor';

const isScanQueueEnabled = process.env.SCAN_QUEUE_ENABLED !== 'false';

@Module({
  imports: [
    ...(isScanQueueEnabled
      ? [
          BullModule.forRoot({
            connection: {
              host: process.env.REDIS_HOST ?? 'localhost',
              port: Number(process.env.REDIS_PORT ?? 6379),
            },
          }),
          BullModule.registerQueue({
            name: SCAN_QUEUE_NAME,
          }),
        ]
      : []),
    TypeOrmModule.forFeature([Scan, AwsAccount, ResourceFinding]),
    AwsScannerModule,
    SecurityModule,
  ],
  providers: [
    ScanQueueService,
    ScanExecutorService,
    ...(isScanQueueEnabled ? [ScanProcessor] : []),
  ],
  exports: [ScanQueueService, ScanExecutorService],
})
export class ScanQueueModule {}
