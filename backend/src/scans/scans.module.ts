import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsAccount } from '../aws-accounts/aws-account.entity';
import { ScanQueueModule } from '../scan-queue/scan-queue.module';
import { ScansController } from './scans.controller';
import { Scan } from './scan.entity';
import { ScansService } from './scans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Scan, AwsAccount]),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 3,
      },
    ]),
    ScanQueueModule,
  ],
  controllers: [ScansController],
  providers: [ScansService],
})
export class ScansModule {}
