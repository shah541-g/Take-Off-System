import { Injectable, Logger } from '@nestjs/common';
import { Balance } from '../../entities/balance.entity';

/**
 * Cache entry structure with expiration
 */
interface CacheEntry {
  balance: Balance;
  expiresAt: Date;
}

/**
 * BalanceCacheService
 * Manages in-memory cache for balance records with TTL (30 minutes)
 * Handles cache invalidation and expiration
 */
@Injectable()
export class BalanceCacheService {
  private readonly logger = new Logger(BalanceCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MINUTES = 30;

  /**
   * Generate a unique cache key for a balance
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Leave type
   * @param year - Balance year
   * @returns Cache key
   */
  getCacheKey(
    employeeId: string,
    locationId: string,
    leaveType: string,
    year: number,
  ): string {
    return `${employeeId}:${locationId}:${leaveType}:${year}`;
  }

  /**
   * Check if a cache key exists and is not expired
   * @param key - Cache key
   * @returns true if key exists and is not expired
   */
  isCached(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry.expiresAt)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get balance from cache
   * @param key - Cache key
   * @returns Balance if found and not expired, null otherwise
   */
  getFromCache(key: string): Balance | null {
    if (!this.isCached(key)) {
      return null;
    }

    const entry = this.cache.get(key);
    return entry ? entry.balance : null;
  }

  /**
   * Store balance in cache with TTL
   * @param key - Cache key
   * @param balance - Balance entity to cache
   * @param ttlMinutes - Time to live in minutes (default 30)
   */
  setInCache(key: string, balance: Balance, ttlMinutes: number = 30): void {
    const expiresAt = this.calculateExpiration(ttlMinutes);
    this.cache.set(key, { balance, expiresAt });

    this.logger.debug(
      `Balance cached: ${key}, expires at ${expiresAt.toISOString()}`,
    );
  }

  /**
   * Invalidate cache for a specific employee-location combination
   * Removes all leave types for that employee-location
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   */
  invalidateCache(employeeId: string, locationId: string): void {
    const keysToDelete: string[] = [];

    // Find all keys matching employee-location pattern
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${employeeId}:${locationId}:`)) {
        keysToDelete.push(key);
      }
    });

    // Delete matching keys
    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.logger.debug(`Cache invalidated: ${key}`);
    });
  }

  /**
   * Invalidate all cache entries for a specific employee
   * Called when employee's balances change significantly
   * @param employeeId - Employee ID
   */
  invalidateAllEmployeeCache(employeeId: string): void {
    const keysToDelete: string[] = [];

    // Find all keys matching employee pattern
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${employeeId}:`)) {
        keysToDelete.push(key);
      }
    });

    // Delete matching keys
    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.logger.debug(`All cache invalidated for employee: ${employeeId}`);
    });
  }

  /**
   * Clear all cache entries
   * Useful for testing or emergency situations
   */
  clearAll(): void {
    this.cache.clear();
    this.logger.debug('All cache cleared');
  }

  /**
   * Get cache statistics (for monitoring)
   * @returns Object with cache size and TTL info
   */
  getStats(): { size: number; ttlMinutes: number } {
    return {
      size: this.cache.size,
      ttlMinutes: this.TTL_MINUTES,
    };
  }

  /**
   * Private helper: Calculate expiration date
   * @param ttlMinutes - Time to live in minutes
   * @returns Future date representing expiration
   */
  private calculateExpiration(ttlMinutes: number): Date {
    const now = new Date();
    return new Date(now.getTime() + ttlMinutes * 60 * 1000);
  }

  /**
   * Private helper: Check if a date has passed
   * @param expiresAt - Expiration date
   * @returns true if date is in the past
   */
  private isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}
