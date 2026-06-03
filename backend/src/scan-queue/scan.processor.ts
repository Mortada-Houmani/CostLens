import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { SCAN_QUEUE_NAME } from './scan-queue.constants';
import { ScanJobData } from './scan-queue.service';
import { ScanExecutorService } from './scan-executor.service';

@Injectable()
@Processor(SCAN_QUEUE_NAME)
export class ScanProcessor extends WorkerHost {
  constructor(private readonly scanExecutorService: ScanExecutorService) {
    super();
  }

  async process(job: Job<ScanJobData>): Promise<void> {
    const { scanId, awsAccountId } = job.data;
    await this.scanExecutorService.execute(scanId, awsAccountId);
  }
}
