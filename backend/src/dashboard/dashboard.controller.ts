import { Controller, Get } from '@nestjs/common';
import {
  DashboardService,
  DashboardSummaryResponse,
} from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(): Promise<DashboardSummaryResponse> {
    return this.dashboardService.getSummary();
  }
}
