import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RUN_SCAN_JOB_NAME, SCAN_QUEUE_NAME } from './scan-queue.constants';

export interface ScanJobData {
  scanId: string;
  awsAccountId: string;
}

@Injectable()
export class ScanQueueService {
  constructor(
    @InjectQueue(SCAN_QUEUE_NAME)
    private readonly scanQueue: Queue<ScanJobData>,
  ) {}

  async addScanJob(data: ScanJobData): Promise<void> {
    await this.scanQueue.add(RUN_SCAN_JOB_NAME, data);
  }
}
