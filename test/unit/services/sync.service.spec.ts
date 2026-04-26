import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../../../src/modules/sync/sync.service';
import { BalancesService } from '../../../src/modules/balances/balances.service';
import { HCMClient } from '../../../src/modules/hcm-integration/hcm-client';
import { DriftDetectionService } from '../../../src/modules/sync/drift-detection.service';
import { ConflictResolutionService } from '../../../src/modules/sync/conflict-resolution.service';
import { AuditService } from '../../../src/modules/audit/audit.service';
import { BatchSyncDto, RealTimeSyncResultDto } from '../../../src/dto/sync.dto';
import { Balance } from '../../../src/entities/balance.entity';

describe('SyncService', () => {
  let service: SyncService;
  let balancesService: jest.Mocked<BalancesService>;
  let hcmClient: jest.Mocked<HCMClient>;
  let driftDetectionService: jest.Mocked<DriftDetectionService>;
  let conflictResolutionService: jest.Mocked<ConflictResolutionService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    balancesService = {
      getBalance: jest.fn(),
    } as any;

    hcmClient = {
      getBalance: jest.fn(),
    } as any;

    driftDetectionService = {
      detectDrift: jest.fn(),
      recordDrift: jest.fn(),
      shouldAlert: jest.fn(),
    } as any;

    conflictResolutionService = {
      reconcileBalance: jest.fn(),
    } as any;

    auditService = {
      logChange: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: BalancesService, useValue: balancesService },
        { provide: HCMClient, useValue: hcmClient },
        { provide: DriftDetectionService, useValue: driftDetectionService },
        { provide: ConflictResolutionService, useValue: conflictResolutionService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('batchSyncBalances', () => {
    it('should correctly process a batch of employees', async () => {
      const batchDto: BatchSyncDto = {
        employees: [
          { employeeId: 'emp1', locationId: 'loc1', leaveType: 'VACATION' }
        ]
      };

      const mockHcmBalance = { available: 10, used: 2 } as any;
      const mockLocalBalance = { available_balance: '10' } as any;

      hcmClient.getBalance.mockResolvedValue(mockHcmBalance);
      balancesService.getBalance.mockResolvedValue(mockLocalBalance);
      driftDetectionService.detectDrift.mockResolvedValue({ hasDrift: false });

      const result = await service.batchSyncBalances(batchDto);

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.drifted).toBe(0);
      expect(conflictResolutionService.reconcileBalance).toHaveBeenCalledWith('emp1', 'loc1', 'VACATION', mockHcmBalance);
      expect(auditService.logChange).toHaveBeenCalled();
    });

    it('should detect and record drift', async () => {
      const batchDto: BatchSyncDto = {
        employees: [
          { employeeId: 'emp1', locationId: 'loc1', leaveType: 'VACATION' }
        ]
      };

      const mockHcmBalance = { available: 10, used: 2 } as any;
      const mockLocalBalance = { available_balance: '15' } as any;
      const mockDrift = { type: 'AVAILABLE_MISMATCH', amount: 5 } as any;

      hcmClient.getBalance.mockResolvedValue(mockHcmBalance);
      balancesService.getBalance.mockResolvedValue(mockLocalBalance);
      driftDetectionService.detectDrift.mockResolvedValue({ hasDrift: true, drift: mockDrift });
      driftDetectionService.shouldAlert.mockResolvedValue(true);

      const result = await service.batchSyncBalances(batchDto);

      expect(result.synced).toBe(1);
      expect(result.drifted).toBe(1);
      expect(driftDetectionService.recordDrift).toHaveBeenCalledWith('emp1', 'loc1', 'VACATION', mockDrift);
    });

    it('should handle errors gracefully during batch item processing', async () => {
      const batchDto: BatchSyncDto = {
        employees: [
          { employeeId: 'emp1', locationId: 'loc1', leaveType: 'VACATION' }
        ]
      };

      hcmClient.getBalance.mockRejectedValue(new Error('HCM Error'));

      const result = await service.batchSyncBalances(batchDto);

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('realTimeSyncBalance', () => {
    it('should fetch fresh balance and return it', async () => {
      const mockHcmBalance = { available: 10, used: 2 } as any;
      const mockLocalBalance = { available_balance: '10' } as any;

      hcmClient.getBalance.mockResolvedValue(mockHcmBalance);
      balancesService.getBalance.mockResolvedValue(mockLocalBalance);
      driftDetectionService.detectDrift.mockResolvedValue({ hasDrift: false });

      const result = await service.realTimeSyncBalance('emp1', 'loc1', 'VACATION', 2024);

      expect(result.availableBalance).toBe(10);
      expect(result.usedBalance).toBe(2);
      expect(result.hasDrift).toBe(false);
      expect(conflictResolutionService.reconcileBalance).toHaveBeenCalledWith('emp1', 'loc1', 'VACATION', mockHcmBalance);
    });

    it('should throw if HCM fails', async () => {
      hcmClient.getBalance.mockRejectedValue(new Error('HCM down'));

      await expect(service.realTimeSyncBalance('emp1', 'loc1', 'VACATION', 2024)).rejects.toThrow('HCM down');
    });
  });
});
