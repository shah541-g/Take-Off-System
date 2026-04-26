import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditLogsRepository } from 'src/repositories/audit-logs.repository';
import { AuditLog } from 'src/entities/audit-log.entity';
import { AuditLogDto } from 'src/dto/audit-log.dto';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogsRepository: jest.Mocked<AuditLogsRepository>;

  const mockAuditLog: AuditLog = {
    id: 'AUDIT001',
    entity_type: 'REQUEST',
    entity_id: 'REQ001',
    action: 'CREATE',
    old_value: null,
    new_value: JSON.stringify({ status: 'PENDING' }),
    reason: 'Request created',
    performed_by: 'USER001',
    ip_address: '192.168.1.1',
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      log: jest.fn(),
      findByEntity: jest.fn(),
      findByDateRange: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<AuditLogsRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditLogsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogsRepository = module.get(AuditLogsRepository);
  });

  describe('logChange', () => {
    it('should create an audit log entry', async () => {
      const dto: AuditLogDto = {
        entityType: 'REQUEST',
        entityId: 'REQ001',
        action: 'CREATE',
        newValue: { status: 'PENDING' },
        reason: 'Request created',
        performedBy: 'USER001',
      };

      auditLogsRepository.log.mockResolvedValue(mockAuditLog);

      const result = await service.logChange(dto);

      expect(result).toEqual(mockAuditLog);
      expect(auditLogsRepository.log).toHaveBeenCalled();
    });

    it('should handle null old_value and new_value', async () => {
      const dto: AuditLogDto = {
        entityType: 'REQUEST',
        entityId: 'REQ001',
        action: 'DELETE',
      };

      auditLogsRepository.log.mockResolvedValue(mockAuditLog);

      await service.logChange(dto);

      expect(auditLogsRepository.log).toHaveBeenCalled();
    });

    it('should store old and new values as JSON strings', async () => {
      const dto: AuditLogDto = {
        entityType: 'REQUEST',
        entityId: 'REQ001',
        action: 'UPDATE',
        oldValue: { status: 'PENDING' },
        newValue: { status: 'APPROVED' },
      };

      auditLogsRepository.log.mockResolvedValue(mockAuditLog);

      await service.logChange(dto);

      const savedEntry = (auditLogsRepository.log as jest.Mock).mock.calls[0][0];
      expect(typeof savedEntry.old_value).toBe('string');
      expect(typeof savedEntry.new_value).toBe('string');
    });

    it('should include optional fields when provided', async () => {
      const dto: AuditLogDto = {
        entityType: 'REQUEST',
        entityId: 'REQ001',
        action: 'UPDATE',
        reason: 'Approval requested',
        performedBy: 'MGR001',
        ipAddress: '10.0.0.1',
      };

      auditLogsRepository.log.mockResolvedValue(mockAuditLog);

      await service.logChange(dto);

      const savedEntry = (auditLogsRepository.log as jest.Mock).mock.calls[0][0];
      expect(savedEntry.reason).toBe('Approval requested');
      expect(savedEntry.performed_by).toBe('MGR001');
      expect(savedEntry.ip_address).toBe('10.0.0.1');
    });
  });

  describe('getAuditLog', () => {
    it('should retrieve audit logs for an entity', async () => {
      const logs: AuditLog[] = [
        mockAuditLog,
        { ...mockAuditLog, action: 'UPDATE', id: 'AUDIT002' },
      ];
      auditLogsRepository.findByEntity.mockResolvedValue(logs);

      const result = await service.getAuditLog('REQUEST', 'REQ001');

      expect(result).toEqual(logs);
      expect(auditLogsRepository.findByEntity).toHaveBeenCalledWith(
        'REQUEST',
        'REQ001',
      );
    });

    it('should return empty array if no logs found', async () => {
      auditLogsRepository.findByEntity.mockResolvedValue([]);

      const result = await service.getAuditLog('REQUEST', 'REQ999');

      expect(result).toEqual([]);
    });

    it('should handle BALANCE entity type', async () => {
      auditLogsRepository.findByEntity.mockResolvedValue([]);

      await service.getAuditLog('BALANCE', 'BAL001');

      expect(auditLogsRepository.findByEntity).toHaveBeenCalledWith(
        'BALANCE',
        'BAL001',
      );
    });

    it('should handle SYNC entity type', async () => {
      auditLogsRepository.findByEntity.mockResolvedValue([]);

      await service.getAuditLog('SYNC', 'SYNC001');

      expect(auditLogsRepository.findByEntity).toHaveBeenCalledWith(
        'SYNC',
        'SYNC001',
      );
    });
  });

  describe('getAuditLogsByDateRange', () => {
    it('should retrieve audit logs within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const logs = [mockAuditLog];
      auditLogsRepository.findByDateRange.mockResolvedValue(logs);

      const result = await service.getAuditLogsByDateRange(startDate, endDate);

      expect(result).toEqual(logs);
      expect(auditLogsRepository.findByDateRange).toHaveBeenCalledWith(
        startDate,
        endDate,
      );
    });

    it('should return empty array if no logs in range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      auditLogsRepository.findByDateRange.mockResolvedValue([]);

      const result = await service.getAuditLogsByDateRange(startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should handle wide date ranges', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const logs = [mockAuditLog];
      auditLogsRepository.findByDateRange.mockResolvedValue(logs);

      const result = await service.getAuditLogsByDateRange(startDate, endDate);

      expect(result).toHaveLength(1);
    });
  });

  describe('getAuditLogCount', () => {
    it('should return count of audit logs for entity', async () => {
      const logs = [mockAuditLog, { ...mockAuditLog, id: 'AUDIT002' }];
      auditLogsRepository.findByEntity.mockResolvedValue(logs);

      const count = await service.getAuditLogCount('REQUEST', 'REQ001');

      expect(count).toBe(2);
    });

    it('should return zero if no logs found', async () => {
      auditLogsRepository.findByEntity.mockResolvedValue([]);

      const count = await service.getAuditLogCount('REQUEST', 'REQ999');

      expect(count).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      const dto: AuditLogDto = {
        entityType: 'REQUEST',
        entityId: 'REQ001',
        action: 'CREATE',
      };

      const error = new Error('Database connection failed');
      auditLogsRepository.log.mockRejectedValue(error);

      await expect(service.logChange(dto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
