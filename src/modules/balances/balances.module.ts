import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Balance } from '../../entities/balance.entity';
import { BalanceHistory } from '../../entities/balance-history.entity';
import { BalancesService } from './balances.service';
import { BalanceCacheService } from './balance-cache.service';
import { BalancesController } from './balances.controller';
import { BalancesRepository } from '../../repositories/balances.repository';
import { HCMModule } from '../hcm-integration/hcm.module';

/**
 * BalancesModule
 * Manages balance cache, validation, and updates
 * Provides balance-related services to other modules
 */
@Module({
  imports: [TypeOrmModule.forFeature([Balance, BalanceHistory]), HCMModule],
  controllers: [BalancesController],
  providers: [BalancesRepository, BalancesService, BalanceCacheService],
  exports: [BalancesService],
})
export class BalancesModule {}
