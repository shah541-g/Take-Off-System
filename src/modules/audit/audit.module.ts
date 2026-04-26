import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditLogsRepository } from '../../repositories/audit-logs.repository';

/**
 * AuditModule
 * Manages audit logging for state changes
 * Provides audit tracking for compliance and debugging
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogsRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
