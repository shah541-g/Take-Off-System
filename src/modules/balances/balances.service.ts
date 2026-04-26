import { Injectable, Logger, Inject } from '@nestjs/common';
import { Balance } from '../../entities/balance.entity';
import { BalancesRepository } from '../../repositories/balances.repository';
import { BalanceCacheService } from './balance-cache.service';
import { HCMClient } from '../hcm-integration/hcm-client';
import {
  InsufficientBalanceException,
  DimensionValidationException,
  NotFoundException,
} from '../../common/exceptions';

/**
 * BalancesService
 * Core service for balance management
 * Handles balance validation, caching, and updates
 */
@Injectable()
export class BalancesService {
  private readonly logger = new Logger(BalancesService.name);

  constructor(
    private readonly balancesRepository: BalancesRepository,
    private readonly balanceCacheService: BalanceCacheService,
    private readonly hcmClient: HCMClient,
  ) {}

  private async hydrateBalanceFromHCM(
    employeeId: string,
    locationId: string,
    leaveType: string,
    year: number,
  ): Promise<Balance | null> {
    const candidateEmployeeIds = [employeeId];
    const lowerCaseEmployeeId = employeeId.toLowerCase();
    if (lowerCaseEmployeeId !== employeeId) {
      candidateEmployeeIds.push(lowerCaseEmployeeId);
    }

    for (const candidateEmployeeId of candidateEmployeeIds) {
      try {
        const hcmBalance = await this.hcmClient.getBalance(
          candidateEmployeeId,
          locationId,
          leaveType,
        );

        const entity = this.balancesRepository.create({
          employee_id: candidateEmployeeId,
          location_id: locationId,
          leave_type: leaveType,
          available_balance: String(hcmBalance.available),
          used_balance: String(hcmBalance.used ?? 0),
          carryover_balance: '0.00',
          balance_year: year,
          hcm_last_updated_at: new Date(),
          readyon_cached_at: new Date(),
          is_stale: false,
          version: 1,
        });

        const saved = await this.balancesRepository.save(entity);
        this.logger.log(
          `Hydrated missing balance from HCM: ${candidateEmployeeId}/${locationId}/${leaveType}`,
        );
        return saved;
      } catch (error) {
        this.logger.debug(
          `Hydration attempt failed for ${candidateEmployeeId}/${locationId}/${leaveType}: ` +
            `${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return null;
  }

  /**
   * Get balance for employee with caching
   * Checks cache first, returns cached value if fresh (< 30 min old)
   * Otherwise fetches from repository and updates cache
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Type of leave
   * @param year - Balance year
   * @returns Balance entity
   * @throws NotFoundException if balance not found
   */
  async getBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
    year: number,
  ): Promise<Balance> {
    const cacheKey = this.balanceCacheService.getCacheKey(
      employeeId,
      locationId,
      leaveType,
      year,
    );

    // Try to get from cache
    const cachedBalance = this.balanceCacheService.getFromCache(cacheKey);
    if (cachedBalance) {
      this.logger.debug(
        `Balance cache hit for ${employeeId}/${leaveType}/${year}`,
      );
      return cachedBalance;
    }

    // Fetch from repository
    this.logger.debug(
      `Balance cache miss for ${employeeId}/${leaveType}/${year}, fetching from DB`,
    );
    const balance = await this.balancesRepository.findByDimensions(
      employeeId,
      locationId,
      leaveType,
    );

    const hydratedBalance =
      balance ||
      (await this.hydrateBalanceFromHCM(
        employeeId,
        locationId,
        leaveType,
        year,
      ));

    if (!hydratedBalance) {
      this.logger.warn(
        `Balance not found: ${employeeId}/${locationId}/${leaveType}`,
      );
      throw new NotFoundException('Balance', 
        `${employeeId}/${locationId}/${leaveType}`);
    }

    // Cache the balance
    this.balanceCacheService.setInCache(cacheKey, hydratedBalance);

    return hydratedBalance;
  }

  /**
   * Validate that employee has sufficient balance for request
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Type of leave
   * @param daysRequested - Number of days requested
   * @param year - Balance year
   * @returns true if sufficient balance
   * @throws InsufficientBalanceException if not enough balance
   */
  async validateBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
    daysRequested: number,
    year: number,
  ): Promise<boolean> {
    this.logger.debug(
      `Validating balance for ${employeeId}/${leaveType}: ${daysRequested} days`,
    );

    const balance = await this.getBalance(
      employeeId,
      locationId,
      leaveType,
      year,
    );

    const available = parseFloat(balance.available_balance);

    if (available < daysRequested) {
      this.logger.warn(
        `Insufficient balance: employee=${employeeId}, type=${leaveType}, available=${available}, requested=${daysRequested}`,
      );
      throw new InsufficientBalanceException(
        `Insufficient balance for ${employeeId}/${leaveType}: available=${balance.available_balance}, requested=${daysRequested}`,
      );
    }

    return true;
  }

  /**
   * Validate that the employee-location-leaveType dimension is valid
   * This ensures the combination exists in the HCM system
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Type of leave
   * @param year - Balance year
   * @returns true if dimension is valid
   * @throws DimensionValidationException if invalid
   */
  async validateDimensions(
    employeeId: string,
    locationId: string,
    leaveType: string,
    year: number,
  ): Promise<boolean> {
    this.logger.debug(
      `Validating dimensions: ${employeeId}/${locationId}/${leaveType}`,
    );

    try {
      const balance = await this.balancesRepository.findByDimensions(
        employeeId,
        locationId,
        leaveType,
      );

      const hydratedBalance =
        balance ||
        (await this.hydrateBalanceFromHCM(
          employeeId,
          locationId,
          leaveType,
          year,
        ));

      if (!hydratedBalance) {
        this.logger.warn(
          `Dimension validation failed: ${employeeId}/${locationId}/${leaveType}`,
        );
        throw new DimensionValidationException(
          `Invalid dimension combination: ${employeeId}/${locationId}/${leaveType}`,
        );
      }

      return true;
    } catch (error) {
      if (
        error instanceof DimensionValidationException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error validating dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Check if a balance cache is stale (> 30 minutes old)
   * @param balance - Balance entity to check
   * @returns true if cache is stale
   */
  isCacheStale(balance: Balance): boolean {
    if (balance.is_stale) {
      return true;
    }

    const cachedAt = new Date(balance.readyon_cached_at);
    const now = new Date();
    const ageMinutes = (now.getTime() - cachedAt.getTime()) / (1000 * 60);

    return ageMinutes > this.getCacheTTL();
  }

  /**
   * Refresh balance from HCM (simulated - actual HCM call in Phase 4)
   * Updates the cache with fresh data
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Type of leave
   * @param year - Balance year
   * @returns Updated balance
   * @throws NotFoundException if balance not found
   */
  async refreshBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
    year: number,
  ): Promise<Balance> {
    this.logger.debug(
      `Refreshing balance from source: ${employeeId}/${leaveType}`,
    );

    // Get fresh balance from DB
    const balance = await this.balancesRepository.findByDimensions(
      employeeId,
      locationId,
      leaveType,
    );

    if (!balance) {
      throw new NotFoundException('Balance',
        `${employeeId}/${locationId}/${leaveType}`);
    }

    // Mark as not stale and update cache timestamp
    balance.is_stale = false;
    balance.readyon_cached_at = new Date();

    // Save updated balance
    await this.balancesRepository.save(balance);

    // Update cache
    const cacheKey = this.balanceCacheService.getCacheKey(
      employeeId,
      locationId,
      leaveType,
      year,
    );
    this.balanceCacheService.setInCache(cacheKey, balance);

    this.logger.debug(`Balance refreshed: ${employeeId}/${leaveType}`);

    return balance;
  }

  /**
   * Update balance when request is approved
   * Decrements available balance and increments used balance
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Type of leave
   * @param daysToDeduct - Number of days to deduct from available balance
   * @throws NotFoundException if balance not found
   */
  async updateUsedBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
    daysToDeduct: number,
  ): Promise<void> {
    this.logger.debug(
      `Updating used balance: ${employeeId}/${leaveType}, deducting ${daysToDeduct} days`,
    );

    const balance = await this.balancesRepository.findByDimensions(
      employeeId,
      locationId,
      leaveType,
    );

    if (!balance) {
      throw new NotFoundException('Balance',
        `${employeeId}/${locationId}/${leaveType}`);
    }

    // Update balances
    const available = parseFloat(balance.available_balance);
    const used = parseFloat(balance.used_balance);

    balance.available_balance = (available - daysToDeduct).toFixed(2);
    balance.used_balance = (used + daysToDeduct).toFixed(2);
    balance.version = (balance.version || 1) + 1;
    balance.updated_at = new Date();

    // Save updated balance
    await this.balancesRepository.save(balance);

    // Invalidate cache to force refresh on next access
    this.balanceCacheService.invalidateCache(employeeId, locationId);

    this.logger.debug(`Used balance updated: ${employeeId}/${leaveType}`);
  }

  /**
   * Refund balance when request is cancelled
   * Increments available balance and decrements used balance
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Type of leave
   * @param daysToRefund - Number of days to refund
   * @throws NotFoundException if balance not found
   */
  async refundBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
    daysToRefund: number,
  ): Promise<void> {
    this.logger.debug(
      `Refunding balance: ${employeeId}/${leaveType}, refunding ${daysToRefund} days`,
    );

    const balance = await this.balancesRepository.findByDimensions(
      employeeId,
      locationId,
      leaveType,
    );

    if (!balance) {
      throw new NotFoundException('Balance',
        `${employeeId}/${locationId}/${leaveType}`);
    }

    // Update balances
    const available = parseFloat(balance.available_balance);
    const used = parseFloat(balance.used_balance);

    balance.available_balance = (available + daysToRefund).toFixed(2);
    balance.used_balance = Math.max(0, used - daysToRefund).toFixed(2);
    balance.version = (balance.version || 1) + 1;
    balance.updated_at = new Date();

    // Save updated balance
    await this.balancesRepository.save(balance);

    // Invalidate cache to force refresh on next access
    this.balanceCacheService.invalidateCache(employeeId, locationId);

    this.logger.debug(`Balance refunded: ${employeeId}/${leaveType}`);
  }

  /**
   * Mark a balance as stale (needs refresh from HCM)
   * Called when balance data may be out of sync
   * @param employeeId - Employee ID
   * @param locationId - Location ID
   * @param leaveType - Type of leave
   */
  async markStale(
    employeeId: string,
    locationId: string,
    leaveType: string,
  ): Promise<void> {
    const balance = await this.balancesRepository.findByDimensions(
      employeeId,
      locationId,
      leaveType,
    );

    if (balance) {
      balance.is_stale = true;
      balance.updated_at = new Date();
      await this.balancesRepository.save(balance);

      this.logger.debug(`Balance marked stale: ${employeeId}/${leaveType}`);
    }
  }

  /**
   * Get cache TTL in minutes
   * @returns TTL in minutes (default 30)
   */
  private getCacheTTL(): number {
    return 30; // 30 minutes
  }
}
