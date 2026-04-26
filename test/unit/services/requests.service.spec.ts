import { Test, TestingModule } from '@nestjs/testing';
import { TimeOffRequestService } from 'src/modules/requests/requests.service';
import { RequestsRepository } from 'src/repositories/requests.repository';
import { BalancesService } from 'src/modules/balances/balances.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { Request } from 'src/entities/request.entity';
import { Balance } from 'src/entities/balance.entity';
import { CreateRequestDto } from 'src/dto/create-request.dto';
import { ApproveRequestDto } from 'src/dto/approve-request.dto';
import {
  InvalidStateTransitionException,
  NotFoundException,
  InsufficientBalanceException,
} from 'src/common/exceptions';

describe('TimeOffRequestService', () => {
  let service: TimeOffRequestService;
  let requestsRepository: jest.Mocked<RequestsRepository>;
  let balancesService: jest.Mocked<BalancesService>;
  let auditService: jest.Mocked<AuditService>;

  const mockBalance: Balance = {
    id: '123',
    employee_id: 'EMP001',
    location_id: 'LOC001',
    leave_type: 'ANNUAL',
    available_balance: '10.00',
    used_balance: '5.00',
    carryover_balance: null,
    balance_year: 2024,
    hcm_last_updated_at: new Date(),
    readyon_cached_at: new Date(),
    is_stale: false,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRequest: Request = {
    id: 'REQ001',
    employee_id: 'EMP001',
    location_id: 'LOC001',
    leave_type: 'ANNUAL',
    start_date: '2024-05-01',
    end_date: '2024-05-05',
    days_requested: '5.00',
    status: 'PENDING',
    balance_snapshot: JSON.stringify({
      availableBalance: '10.00',
      usedBalance: '5.00',
      snapshotAt: new Date(),
    }),
    submitted_at: new Date(),
    approved_at: null,
    rejection_reason: null,
    hcm_sync_status: 'PENDING',
    hcm_request_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockReqRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      findWithLock: jest.fn(),
      findByEmployeeAndStatus: jest.fn(),
      findRecent: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<RequestsRepository>;

    const mockBalances = {
      validateDimensions: jest.fn(),
      validateBalance: jest.fn(),
      getBalance: jest.fn(),
      refreshBalance: jest.fn(),
      updateUsedBalance: jest.fn(),
      refundBalance: jest.fn(),
      isCacheStale: jest.fn(),
      markStale: jest.fn(),
    } as unknown as jest.Mocked<BalancesService>;

    const mockAudit = {
      logChange: jest.fn(),
      getAuditLog: jest.fn(),
      getAuditLogsByDateRange: jest.fn(),
      getAuditLogCount: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffRequestService,
        { provide: RequestsRepository, useValue: mockReqRepository },
        { provide: BalancesService, useValue: mockBalances },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<TimeOffRequestService>(TimeOffRequestService);
    requestsRepository = module.get(RequestsRepository);
    balancesService = module.get(BalancesService);
    auditService = module.get(AuditService);
  });

  describe('createRequest', () => {
    const createDto: CreateRequestDto = {
      employeeId: 'EMP001',
      locationId: 'LOC001',
      leaveType: 'ANNUAL',
      startDate: '2024-05-01',
      endDate: '2024-05-05',
      daysRequested: 5,
    };

    it('should create a request successfully', async () => {
      balancesService.validateDimensions.mockResolvedValue(true);
      balancesService.validateBalance.mockResolvedValue(true);
      balancesService.getBalance.mockResolvedValue(mockBalance);
      requestsRepository.save.mockResolvedValue(mockRequest);
      auditService.logChange.mockResolvedValue({} as any);

      const result = await service.createRequest(createDto);

      expect(result.status).toBe('PENDING');
      expect(requestsRepository.save).toHaveBeenCalled();
      expect(auditService.logChange).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entityType: 'REQUEST',
        }),
      );
    });

    it('should fail if dimensions are invalid', async () => {
      balancesService.validateDimensions.mockRejectedValue(
        new Error('Dimension validation failed'),
      );

      await expect(service.createRequest(createDto)).rejects.toThrow();
    });

    it('should fail if balance is insufficient', async () => {
      balancesService.validateDimensions.mockResolvedValue(true);
      balancesService.validateBalance.mockRejectedValue(
        new InsufficientBalanceException('Insufficient balance for test'),
      );

      await expect(service.createRequest(createDto)).rejects.toThrow(
        InsufficientBalanceException,
      );
    });

    it('should store balance snapshot', async () => {
      balancesService.validateDimensions.mockResolvedValue(true);
      balancesService.validateBalance.mockResolvedValue(true);
      balancesService.getBalance.mockResolvedValue(mockBalance);
      requestsRepository.save.mockResolvedValue(mockRequest);
      auditService.logChange.mockResolvedValue({} as any);

      await service.createRequest(createDto);

      const savedRequest = (requestsRepository.save as jest.Mock).mock
        .calls[0][0];
      expect(savedRequest.balance_snapshot).toBeTruthy();
      const snapshot = JSON.parse(savedRequest.balance_snapshot);
      expect(snapshot.availableBalance).toEqual(mockBalance.available_balance);
    });
  });

  describe('getRequest', () => {
    it('should return request by ID', async () => {
      requestsRepository.findOne.mockResolvedValue(mockRequest);

      const result = await service.getRequest('REQ001');

      expect(result).toEqual(mockRequest);
    });

    it('should throw NotFoundException if request not found', async () => {
      requestsRepository.findOne.mockResolvedValue(null);

      await expect(service.getRequest('REQ999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approveRequest', () => {
    const approveDto: ApproveRequestDto = {
      approverId: 'MGR001',
    };

    it('should approve a pending request', async () => {
      const pendingRequest: Request = { ...mockRequest, status: 'PENDING' };
      requestsRepository.findWithLock.mockResolvedValue(pendingRequest);
      balancesService.refreshBalance.mockResolvedValue(mockBalance);
      balancesService.validateBalance.mockResolvedValue(true);
      requestsRepository.save.mockResolvedValue({
        ...pendingRequest,
        status: 'APPROVED',
        approved_at: new Date(),
      });
      balancesService.updateUsedBalance.mockResolvedValue(undefined);
      auditService.logChange.mockResolvedValue({} as any);

      const result = await service.approveRequest('REQ001', approveDto);

      expect(result.status).toBe('APPROVED');
      expect(result.approved_at).toBeTruthy();
      expect(balancesService.refreshBalance).toHaveBeenCalled();
      expect(balancesService.updateUsedBalance).toHaveBeenCalled();
    });

    it('should throw InvalidStateTransitionException if not PENDING', async () => {
      const approvedRequest: Request = {
        ...mockRequest,
        status: 'APPROVED',
      };
      requestsRepository.findWithLock.mockResolvedValue(approvedRequest);

      await expect(
        service.approveRequest('REQ001', approveDto),
      ).rejects.toThrow(InvalidStateTransitionException);
    });

    it('should throw if balance becomes insufficient', async () => {
      const pendingRequest: Request = { ...mockRequest, status: 'PENDING' };
      requestsRepository.findWithLock.mockResolvedValue(pendingRequest);
      balancesService.refreshBalance.mockResolvedValue(mockBalance);
      balancesService.validateBalance.mockRejectedValue(
        new InsufficientBalanceException('Insufficient balance for test'),
      );

      await expect(
        service.approveRequest('REQ001', approveDto),
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('should log HCM sync audit event', async () => {
      const pendingRequest: Request = { ...mockRequest, status: 'PENDING' };
      requestsRepository.findWithLock.mockResolvedValue(pendingRequest);
      balancesService.refreshBalance.mockResolvedValue(mockBalance);
      balancesService.validateBalance.mockResolvedValue(true);
      requestsRepository.save.mockResolvedValue({
        ...pendingRequest,
        status: 'APPROVED',
      });
      balancesService.updateUsedBalance.mockResolvedValue(undefined);
      auditService.logChange.mockResolvedValue({} as any);

      await service.approveRequest('REQ001', approveDto);

      expect(auditService.logChange).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SYNC',
          entityType: 'REQUEST',
        }),
      );
    });
  });

  describe('rejectRequest', () => {
    it('should reject a pending request', async () => {
      const pendingRequest: Request = { ...mockRequest, status: 'PENDING' };
      requestsRepository.findOne.mockResolvedValue(pendingRequest);
      requestsRepository.save.mockResolvedValue({
        ...pendingRequest,
        status: 'REJECTED',
        rejection_reason: 'Not approved',
      });
      auditService.logChange.mockResolvedValue({} as any);

      const result = await service.rejectRequest('REQ001', 'Not approved');

      expect(result.status).toBe('REJECTED');
      expect(result.rejection_reason).toBe('Not approved');
    });

    it('should throw InvalidStateTransitionException if not PENDING', async () => {
      const approvedRequest: Request = {
        ...mockRequest,
        status: 'APPROVED',
      };
      requestsRepository.findOne.mockResolvedValue(approvedRequest);

      await expect(
        service.rejectRequest('REQ001', 'Not approved'),
      ).rejects.toThrow(InvalidStateTransitionException);
    });
  });

  describe('cancelRequest', () => {
    it('should cancel an approved request', async () => {
      const approvedRequest: Request = { ...mockRequest, status: 'APPROVED' };
      requestsRepository.findOne.mockResolvedValue(approvedRequest);
      balancesService.refundBalance.mockResolvedValue(undefined);
      requestsRepository.save.mockResolvedValue({
        ...approvedRequest,
        status: 'CANCELLED',
      });
      auditService.logChange.mockResolvedValue({} as any);

      const result = await service.cancelRequest('REQ001', 'Changed mind');

      expect(result.status).toBe('CANCELLED');
    });

    it('should refund balance when cancelling', async () => {
      const approvedRequest: Request = { ...mockRequest, status: 'APPROVED' };
      requestsRepository.findOne.mockResolvedValue(approvedRequest);
      balancesService.refundBalance.mockResolvedValue(undefined);
      requestsRepository.save.mockResolvedValue({
        ...approvedRequest,
        status: 'CANCELLED',
      });
      auditService.logChange.mockResolvedValue({} as any);

      await service.cancelRequest('REQ001');

      expect(balancesService.refundBalance).toHaveBeenCalledWith(
        approvedRequest.employee_id,
        approvedRequest.location_id,
        approvedRequest.leave_type,
        parseFloat(approvedRequest.days_requested),
      );
    });

    it('should throw InvalidStateTransitionException if not APPROVED', async () => {
      const pendingRequest: Request = { ...mockRequest, status: 'PENDING' };
      requestsRepository.findOne.mockResolvedValue(pendingRequest);

      await expect(service.cancelRequest('REQ001')).rejects.toThrow(
        InvalidStateTransitionException,
      );
    });
  });

  describe('getRequestsByEmployee', () => {
    it('should return all requests for employee', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRequest]),
      };
      requestsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getRequestsByEmployee('EMP001');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockRequest);
    });

    it('should filter by status', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      requestsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.getRequestsByEmployee('EMP001', { status: 'APPROVED' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.any(Object),
      );
    });
  });
});
