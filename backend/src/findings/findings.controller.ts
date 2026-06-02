import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { FindFindingsQueryDto } from './dto/find-findings-query.dto';
import { FindingResponse, FindingsService } from './findings.service';

@Controller('findings')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get()
  findAll(@Query() query: FindFindingsQueryDto): Promise<FindingResponse[]> {
    return this.findingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FindingResponse> {
    return this.findingsService.findOne(id);
  }
}
