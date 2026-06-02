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
import { AwsAccountResponse, AwsAccountsService } from './aws-accounts.service';
import { CreateAwsAccountDto } from './dto/create-aws-account.dto';

@Controller('aws-accounts')
export class AwsAccountsController {
  constructor(private readonly awsAccountsService: AwsAccountsService) {}

  @Post()
  create(
    @Body() createAwsAccountDto: CreateAwsAccountDto,
  ): Promise<AwsAccountResponse> {
    return this.awsAccountsService.create(createAwsAccountDto);
  }

  @Get()
  findAll(): Promise<AwsAccountResponse[]> {
    return this.awsAccountsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AwsAccountResponse> {
    return this.awsAccountsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.awsAccountsService.remove(id);
  }
}
