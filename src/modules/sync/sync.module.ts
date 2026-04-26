import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceHistory } from '../../entities/balance-history.entity';
import { BalancesModule } from '../balances/balances.module';
import { HCMModule } from '../hcm-integration/hcm.module';
import { AuditModule } from '../audit/audit.module';
import { SyncService } from './sync.service';
import { DriftDetectionService } from './drift-detection.service';
import { ConflictResolutionService } from './conflict-resolution.service';
import { BalanceHistoryRepository } from '../../repositories/balance-history.repository';
import { BalancesRepository } from '../../repositories/balances.repository';

/**
 * SyncModule
 * Manages synchronization between ReadyOn and HCM
 * Handles drift detection and conflict resolution
 * Exports SyncService for use by other modules (e.g., RequestsModule)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([BalanceHistory]),
    BalancesModule,
    HCMModule,
    AuditModule,
  ],
  providers: [
    BalanceHistoryRepository,
    BalancesRepository,
    SyncService,
    DriftDetectionService,
    ConflictResolutionService,
  ],
  exports: [SyncService, DriftDetectionService, ConflictResolutionService],
})
export class SyncModule {}
