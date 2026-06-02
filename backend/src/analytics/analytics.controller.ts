import { Controller, Get, Query } from '@nestjs/common';
import {
  AnalyticsMetricsQueryDto,
  AnalyticsResourcesQueryDto,
} from './dto/analytics-query.dto';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('resources')
  getResources(@Query() query: AnalyticsResourcesQueryDto) {
    return this.analyticsService.getResources(query.service);
  }

  @Get('metrics')
  getMetrics(@Query() query: AnalyticsMetricsQueryDto) {
    return this.analyticsService.getMetrics(
      query.service,
      query.resourceId,
      query.range ?? 'weekly',
    );
  }
}
