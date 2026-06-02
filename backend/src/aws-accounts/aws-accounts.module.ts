import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../security/security.module';
import { User } from '../users/user.entity';
import { AwsAccount } from './aws-account.entity';
import { AwsAccountsController } from './aws-accounts.controller';
import { AwsAccountsService } from './aws-accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([AwsAccount, User]), SecurityModule],
  controllers: [AwsAccountsController],
  providers: [AwsAccountsService],
})
export class AwsAccountsModule {}
