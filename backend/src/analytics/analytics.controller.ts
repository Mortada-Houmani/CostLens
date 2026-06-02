import { Controller, Get, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  AnalyticsMetricsQueryDto,
  AnalyticsResourcesQueryDto,
} from './dto/analytics-query.dto';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('resources')
  getResources(
    @CurrentUser() user: AuthUser,
    @Query() query: AnalyticsResourcesQueryDto,
  ) {
    return this.analyticsService.getResources(user.id, query.service);
  }

  @Get('metrics')
  getMetrics(
    @CurrentUser() user: AuthUser,
    @Query() query: AnalyticsMetricsQueryDto,
  ) {
    return this.analyticsService.getMetrics(
      user.id,
      query.service,
      query.resourceId,
      query.range ?? 'weekly',
    );
  }
}
