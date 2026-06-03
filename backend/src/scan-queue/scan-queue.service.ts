import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RUN_SCAN_JOB_NAME, SCAN_QUEUE_NAME } from './scan-queue.constants';

export interface ScanJobData {
  scanId: string;
  awsAccountId: string;
}

@Injectable()
export class ScanQueueService {
  constructor(
    @Optional()
    @InjectQueue(SCAN_QUEUE_NAME)
    private readonly scanQueue?: Queue<ScanJobData>,
  ) {}

  isEnabled(): boolean {
    return (
      process.env.SCAN_QUEUE_ENABLED !== 'false' && Boolean(this.scanQueue)
    );
  }

  async addScanJob(data: ScanJobData): Promise<void> {
    if (!this.scanQueue) {
      throw new Error('Scan queue is disabled.');
    }

    await this.scanQueue.add(RUN_SCAN_JOB_NAME, data);
  }
}
