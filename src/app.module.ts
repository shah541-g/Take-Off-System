import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { HealthModule } from './modules/health/health.module';
import { RequestsModule } from './modules/requests/requests.module';
import { BalancesModule } from './modules/balances/balances.module';
import { AuditModule } from './modules/audit/audit.module';
import { SyncModule } from './modules/sync/sync.module';
import { HCMModule } from './modules/hcm-integration/hcm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    HealthModule,
    RequestsModule,
    BalancesModule,
    AuditModule,
    SyncModule,
    HCMModule,
  ],
})
export class AppModule {}
