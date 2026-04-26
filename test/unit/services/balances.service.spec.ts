import { Test, TestingModule } from '@nestjs/testing';
import { BalancesService } from 'src/modules/balances/balances.service';
import { BalanceCacheService } from 'src/modules/balances/balance-cache.service';
import { BalancesRepository } from 'src/repositories/balances.repository';
import { Balance } from 'src/entities/balance.entity';
import { HCMClient } from 'src/modules/hcm-integration/hcm-client';
import {
  InsufficientBalanceException,
  DimensionValidationException,
  NotFoundException,
} from 'src/common/exceptions';

describe('BalancesService', () => {
  let service: BalancesService;
  let balancesRepository: jest.Mocked<BalancesRepository>;
  let cacheService: jest.Mocked<BalanceCacheService>;

  const mockBalance: Balance = {
    id: '123',
    employee_id: 'EMP001',
    location_id: 'LOC001',
    leave_type: 'ANNUAL',
    available_balance: '10.00',
    used_balance: '5.00',
    carryover_balance: null,
    balance_year: 2024,
    hcm_last_updated_at: new Date('2024-01-01'),
    readyon_cached_at: new Date('2024-01-15'),
    is_stale: false,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findByDimensions: jest.fn(),
      findStale: jest.fn(),
      findByEmployee: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<BalancesRepository>;

    const mockCache = {
      getCacheKey: jest.fn(),
      isCached: jest.fn(),
      getFromCache: jest.fn(),
      setInCache: jest.fn(),
      invalidateCache: jest.fn(),
      invalidateAllEmployeeCache: jest.fn(),
      clearAll: jest.fn(),
      getStats: jest.fn(),
    } as unknown as jest.Mocked<BalanceCacheService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalancesService,
        { provide: BalancesRepository, useValue: mockRepository },
        { provide: BalanceCacheService, useValue: mockCache },
        { provide: HCMClient, useValue: { getBalance: jest.fn() } },
      ],
    }).compile();

    service = module.get<BalancesService>(BalancesService);
    balancesRepository = module.get(BalancesRepository);
    cacheService = module.get(BalanceCacheService);
  });

  describe('getBalance', () => {
    it('should return balance from cache if available', async () => {
      const cacheKey = 'EMP001:LOC001:ANNUAL:2024';
      cacheService.getCacheKey.mockReturnValue(cacheKey);
      cacheService.getFromCache.mockReturnValue(mockBalance);

      const result = await service.getBalance(
        'EMP001',
        'LOC001',
        'ANNUAL',
        2024,
      );

      expect(result).toEqual(mockBalance);
      expect(cacheService.getFromCache).toHaveBeenCalledWith(cacheKey);
      expect(balancesRepository.findByDimensions).not.toHaveBeenCalled();
    });

    it('should fetch from repository and cache if not in cache', async () => {
      const cacheKey = 'EMP001:LOC001:ANNUAL:2024';
      cacheService.getCacheKey.mockReturnValue(cacheKey);
      cacheService.getFromCache.mockReturnValue(null);
      balancesRepository.findByDimensions.mockResolvedValue(mockBalance);

      const result = await service.getBalance(
        'EMP001',
        'LOC001',
        'ANNUAL',
        2024,
      );

      expect(result).toEqual(mockBalance);
      expect(balancesRepository.findByDimensions).toHaveBeenCalledWith(
        'EMP001',
        'LOC001',
        'ANNUAL',
      );
      expect(cacheService.setInCache).toHaveBeenCalledWith(
        cacheKey,
        mockBalance,
      );
    });

    it('should throw NotFoundException if balance not found', async () => {
      const cacheKey = 'EMP001:LOC001:ANNUAL:2024';
      cacheService.getCacheKey.mockReturnValue(cacheKey);
      cacheService.getFromCache.mockReturnValue(null);
      balancesRepository.findByDimensions.mockResolvedValue(null);

      await expect(
        service.getBalance('EMP001', 'LOC001', 'ANNUAL', 2024),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateBalance', () => {
    it('should return true if balance is sufficient', async () => {
      balancesRepository.findByDimensions.mockResolvedValue(mockBalance);
      cacheService.getCacheKey.mockReturnValue('key');
      cacheService.getFromCache.mockReturnValue(mockBalance);

      const result = await service.validateBalance(
        'EMP001',
        'LOC001',
        'ANNUAL',
        5.00,
        2024,
      );

      expect(result).toBe(true);
    });

    it('should throw InsufficientBalanceException if balance is insufficient', async () => {
      balancesRepository.findByDimensions.mockResolvedValue(mockBalance);
      cacheService.getCacheKey.mockReturnValue('key');
      cacheService.getFromCache.mockReturnValue(mockBalance);

      await expect(
        service.validateBalance(
          'EMP001',
          'LOC001',
          'ANNUAL',
          15.00,
          2024,
        ),
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('should handle zero balance correctly', async () => {
      const zeroBalance = { ...mockBalance, available_balance: '0.00' };
      balancesRepository.findByDimensions.mockResolvedValue(zeroBalance);
      cacheService.getCacheKey.mockReturnValue('key');
      cacheService.getFromCache.mockReturnValue(zeroBalance);

      await expect(
        service.validateBalance(
          'EMP001',
          'LOC001',
          'ANNUAL',
          0.5,
          2024,
        ),
      ).rejects.toThrow(InsufficientBalanceException);
    });
  });

  describe('validateDimensions', () => {
    it('should return true if dimensions are valid', async () => {
      balancesRepository.findByDimensions.mockResolvedValue(mockBalance);

      const result = await service.validateDimensions(
        'EMP001',
        'LOC001',
        'ANNUAL',
        2024,
      );

      expect(result).toBe(true);
    });

    it('should throw DimensionValidationException if dimensions are invalid', async () => {
      balancesRepository.findByDimensions.mockResolvedValue(null);

      await expect(
        service.validateDimensions('EMP001', 'LOC001', 'ANNUAL', 2024),
      ).rejects.toThrow(DimensionValidationException);
    });
  });

  describe('isCacheStale', () => {
    it('should return true if is_stale flag is set', () => {
      const staleBalance = { ...mockBalance, is_stale: true };
      const result = service.isCacheStale(staleBalance);
      expect(result).toBe(true);
    });

    it('should return false if cache is fresh', () => {
      const freshBalance = { ...mockBalance, is_stale: false };
      const now = new Date();
      freshBalance.readyon_cached_at = new Date(
        now.getTime() - 10 * 60 * 1000,
      ); // 10 minutes ago

      const result = service.isCacheStale(freshBalance);
      expect(result).toBe(false);
    });

    it('should return true if cache is older than 30 minutes', () => {
      const oldBalance = { ...mockBalance, is_stale: false };
      const now = new Date();
      oldBalance.readyon_cached_at = new Date(
        now.getTime() - 31 * 60 * 1000,
      ); // 31 minutes ago

      const result = service.isCacheStale(oldBalance);
      expect(result).toBe(true);
    });
  });

  describe('refreshBalance', () => {
    it('should refresh balance from repository', async () => {
      balancesRepository.findByDimensions.mockResolvedValue(mockBalance);
      balancesRepository.save.mockResolvedValue({
        ...mockBalance,
        is_stale: false,
      });
      cacheService.getCacheKey.mockReturnValue('key');

      await service.refreshBalance('EMP001', 'LOC001', 'ANNUAL', 2024);

      expect(balancesRepository.findByDimensions).toHaveBeenCalled();
      expect(balancesRepository.save).toHaveBeenCalled();
      expect(cacheService.setInCache).toHaveBeenCalled();
    });

    it('should throw NotFoundException if balance not found', async () => {
      balancesRepository.findByDimensions.mockResolvedValue(null);

      await expect(
        service.refreshBalance('EMP001', 'LOC001', 'ANNUAL', 2024),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUsedBalance', () => {
    it('should deduct days from available and add to used balance', async () => {
      balancesRepository.findByDimensions.mockResolvedValue(mockBalance);
      balancesRepository.save.mockResolvedValue(mockBalance);

      await service.updateUsedBalance(
        'EMP001',
        'LOC001',
        'ANNUAL',
        2.5,
      );

      expect(balancesRepository.save).toHaveBeenCalled();
      expect(cacheService.invalidateCache).toHaveBeenCalledWith(
        'EMP001',
        'LOC001',
      );
    });

    it('should throw NotFoundException if balance not found', async () => {
      balancesRepository.findByDimensions.mockResolvedValue(null);

      await expect(
        service.updateUsedBalance('EMP001', 'LOC001', 'ANNUAL', 2.5),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markStale', () => {
    it('should mark balance as stale', async () => {
      balancesRepository.findByDimensions.mockResolvedValue(mockBalance);
      balancesRepository.save.mockResolvedValue(mockBalance);

      await service.markStale('EMP001', 'LOC001', 'ANNUAL');

      expect(balancesRepository.save).toHaveBeenCalled();
    });
  });
});
