import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FindingsController } from './findings.controller';
import { FindingsService } from './findings.service';
import { ResourceFinding } from './resource-finding.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceFinding])],
  controllers: [FindingsController],
  providers: [FindingsService],
})
export class FindingsModule {}
