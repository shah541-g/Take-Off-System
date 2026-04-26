import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Request } from '../../entities/request.entity';
import { TimeOffRequestService } from './requests.service';
import { RequestsController } from './requests.controller';
import { RequestsRepository } from '../../repositories/requests.repository';
import { BalancesModule } from '../balances/balances.module';
import { AuditModule } from '../audit/audit.module';

/**
 * RequestsModule
 * Manages time-off requests with full lifecycle support
 * Depends on BalancesModule for balance validation and AuditModule for logging
 */
@Module({
  imports: [TypeOrmModule.forFeature([Request]), BalancesModule, AuditModule],
  controllers: [RequestsController],
  providers: [RequestsRepository, TimeOffRequestService],
  exports: [TimeOffRequestService],
})
export class RequestsModule {}
