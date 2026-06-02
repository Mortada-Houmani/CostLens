import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { ScanResponse, ScansService } from './scans.service';

@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post(':awsAccountId/start')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  start(
    @CurrentUser() user: AuthUser,
    @Param('awsAccountId', ParseUUIDPipe) awsAccountId: string,
  ): Promise<ScanResponse> {
    return this.scansService.start(user.id, awsAccountId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<ScanResponse[]> {
    return this.scansService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ScanResponse> {
    return this.scansService.findOne(user.id, id);
  }
}
