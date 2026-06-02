import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scan } from '../scans/scan.entity';
import { FindingsController } from './findings.controller';
import { FindingsService } from './findings.service';
import { ResourceFinding } from './resource-finding.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceFinding, Scan])],
  controllers: [FindingsController],
  providers: [FindingsService],
})
export class FindingsModule {}
