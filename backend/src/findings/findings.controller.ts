import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { FindFindingsQueryDto } from './dto/find-findings-query.dto';
import { FindingResponse, FindingsService } from './findings.service';

@Controller('findings')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: FindFindingsQueryDto,
  ): Promise<FindingResponse[]> {
    return this.findingsService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FindingResponse> {
    return this.findingsService.findOne(user.id, id);
  }
}
