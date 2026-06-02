import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceFinding } from '../findings/resource-finding.entity';
import { Scan } from '../scans/scan.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceFinding, Scan])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
