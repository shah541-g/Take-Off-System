import { BalanceCacheService } from 'src/modules/balances/balance-cache.service';
import { Balance } from 'src/entities/balance.entity';

describe('BalanceCacheService', () => {
  let service: BalanceCacheService;

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

  beforeEach(() => {
    service = new BalanceCacheService();
  });

  describe('getCacheKey', () => {
    it('should generate consistent cache key', () => {
      const key = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      expect(key).toBe('EMP001:LOC001:ANNUAL:2024');
    });

    it('should generate different keys for different inputs', () => {
      const key1 = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      const key2 = service.getCacheKey('EMP002', 'LOC001', 'ANNUAL', 2024);
      expect(key1).not.toBe(key2);
    });
  });

  describe('cache operations', () => {
    it('should store and retrieve balance from cache', () => {
      const key = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      service.setInCache(key, mockBalance);

      expect(service.isCached(key)).toBe(true);
      const cached = service.getFromCache(key);
      expect(cached).toEqual(mockBalance);
    });

    it('should return null for non-existent cache key', () => {
      const key = service.getCacheKey('EMP999', 'LOC999', 'ANNUAL', 2024);
      expect(service.isCached(key)).toBe(false);
      expect(service.getFromCache(key)).toBeNull();
    });

    it('should expire cache after TTL', (done) => {
      const key = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      service.setInCache(key, mockBalance, 0.01); // 0.01 minutes = ~600ms

      expect(service.isCached(key)).toBe(true);

      setTimeout(() => {
        expect(service.isCached(key)).toBe(false);
        done();
      }, 700);
    });

    it('should respect custom TTL', (done) => {
      const key = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      service.setInCache(key, mockBalance, 0.05); // 0.05 minutes = ~3000ms

      setTimeout(() => {
        expect(service.isCached(key)).toBe(true);
        done();
      }, 1000);
    });
  });

  describe('invalidateCache', () => {
    it('should remove cache entries for employee-location', () => {
      const key1 = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      const key2 = service.getCacheKey('EMP001', 'LOC001', 'SICK', 2024);
      const key3 = service.getCacheKey('EMP001', 'LOC002', 'ANNUAL', 2024);

      service.setInCache(key1, mockBalance);
      service.setInCache(key2, mockBalance);
      service.setInCache(key3, mockBalance);

      // Invalidate EMP001:LOC001
      service.invalidateCache('EMP001', 'LOC001');

      expect(service.isCached(key1)).toBe(false);
      expect(service.isCached(key2)).toBe(false);
      expect(service.isCached(key3)).toBe(true); // Different location
    });

    it('should not affect other employees', () => {
      const key1 = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      const key2 = service.getCacheKey('EMP002', 'LOC001', 'ANNUAL', 2024);

      service.setInCache(key1, mockBalance);
      service.setInCache(key2, mockBalance);

      service.invalidateCache('EMP001', 'LOC001');

      expect(service.isCached(key1)).toBe(false);
      expect(service.isCached(key2)).toBe(true);
    });
  });

  describe('invalidateAllEmployeeCache', () => {
    it('should remove all cache entries for employee', () => {
      const key1 = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      const key2 = service.getCacheKey('EMP001', 'LOC001', 'SICK', 2024);
      const key3 = service.getCacheKey('EMP001', 'LOC002', 'ANNUAL', 2024);
      const key4 = service.getCacheKey('EMP002', 'LOC001', 'ANNUAL', 2024);

      service.setInCache(key1, mockBalance);
      service.setInCache(key2, mockBalance);
      service.setInCache(key3, mockBalance);
      service.setInCache(key4, mockBalance);

      service.invalidateAllEmployeeCache('EMP001');

      expect(service.isCached(key1)).toBe(false);
      expect(service.isCached(key2)).toBe(false);
      expect(service.isCached(key3)).toBe(false);
      expect(service.isCached(key4)).toBe(true); // Different employee
    });
  });

  describe('clearAll', () => {
    it('should remove all cache entries', () => {
      const key1 = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      const key2 = service.getCacheKey('EMP002', 'LOC002', 'SICK', 2025);

      service.setInCache(key1, mockBalance);
      service.setInCache(key2, mockBalance);

      service.clearAll();

      expect(service.isCached(key1)).toBe(false);
      expect(service.isCached(key2)).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const key1 = service.getCacheKey('EMP001', 'LOC001', 'ANNUAL', 2024);
      const key2 = service.getCacheKey('EMP002', 'LOC002', 'SICK', 2025);

      service.setInCache(key1, mockBalance);
      service.setInCache(key2, mockBalance);

      const stats = service.getStats();

      expect(stats.size).toBe(2);
      expect(stats.ttlMinutes).toBe(30);
    });

    it('should return zero size for empty cache', () => {
      const stats = service.getStats();
      expect(stats.size).toBe(0);
    });
  });
});
