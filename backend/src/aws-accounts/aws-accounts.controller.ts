import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { AwsAccountResponse, AwsAccountsService } from './aws-accounts.service';
import { CreateAwsAccountDto } from './dto/create-aws-account.dto';

@Controller('aws-accounts')
export class AwsAccountsController {
  constructor(private readonly awsAccountsService: AwsAccountsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() createAwsAccountDto: CreateAwsAccountDto,
  ): Promise<AwsAccountResponse> {
    return this.awsAccountsService.create(user.id, createAwsAccountDto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<AwsAccountResponse[]> {
    return this.awsAccountsService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AwsAccountResponse> {
    return this.awsAccountsService.findOne(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.awsAccountsService.remove(user.id, id);
  }
}
