import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ScanResponse, ScansService } from './scans.service';

@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post(':awsAccountId/start')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  start(
    @Param('awsAccountId', ParseUUIDPipe) awsAccountId: string,
  ): Promise<ScanResponse> {
    return this.scansService.start(awsAccountId);
  }

  @Get()
  findAll(): Promise<ScanResponse[]> {
    return this.scansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ScanResponse> {
    return this.scansService.findOne(id);
  }
}
