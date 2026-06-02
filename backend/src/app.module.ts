import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from './analytics/analytics.module';
import { AccessTokenGuard } from './auth/access-token.guard';
import { AwsAccountsModule } from './aws-accounts/aws-accounts.module';
import { AwsScannerModule } from './aws-scanner/aws-scanner.module';
import databaseConfig from './config/database.config';
import { DashboardModule } from './dashboard/dashboard.module';
import { FindingsModule } from './findings/findings.module';
import { HealthModule } from './health/health.module';
import { ScansModule } from './scans/scans.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) => config,
    }),
    AnalyticsModule,
    UsersModule,
    AwsAccountsModule,
    AwsScannerModule,
    ScansModule,
    FindingsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AppModule {}
