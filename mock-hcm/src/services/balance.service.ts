import { Injectable, OnModuleInit } from '@nestjs/common';
import { BehaviorEngine } from './behavior-engine.service';
import { SEED_DATA } from '../fixtures/seed-data';
import {
  HCMInvalidDimensionException,
  InsufficientBalanceException,
  HCMTimeoutException,
} from '../common/exceptions';
import { v4 as uuid } from 'uuid';

export interface Balance {
  employeeId: string;
  locationId: string;
  leaveType: string;
  available: number;
  used: number;
  pending: number;
  lastUpdated: Date;
}

export interface BalanceResponse {
  employeeId: string;
  locationId: string;
  leaveType: string;
  available: number;
  used: number;
  pending: number;
}

/**
 * BalanceService manages balance data with behavior injection
 */
@Injectable()
export class BalanceService implements OnModuleInit {
  private balances = new Map<string, Balance>();

  constructor(private behaviorEngine: BehaviorEngine) {}

  onModuleInit(): void {
    this.initializeSeedData();
  }

  /**
   * Build a normalized map key to ensure consistent casing.
   * employeeId -> lowercase, locationId -> UPPERCASE, leaveType -> UPPERCASE
   */
  private buildKey(
    employeeId: string,
    locationId: string,
    leaveType: string,
  ): string {
    return `${employeeId.toLowerCase()}/${locationId.toUpperCase()}/${leaveType.toUpperCase()}`;
  }

  /**
   * Initialize seed data from fixtures
   */
  private initializeSeedData(): void {
    for (const employee of SEED_DATA.employees) {
      for (const balance of employee.balances) {
        const key = this.buildKey(
          employee.employeeId,
          balance.locationId,
          balance.leaveType,
        );
        this.balances.set(key, {
          employeeId: employee.employeeId.toLowerCase(),
          locationId: balance.locationId.toUpperCase(),
          leaveType: balance.leaveType.toUpperCase(),
          available: balance.available,
          used: balance.used,
          pending: balance.pending,
          lastUpdated: new Date(),
        });
      }
    }
  }

  /**
   * Get balance for employee with behavior applied
   */
  async getBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
  ): Promise<BalanceResponse> {
    // Validate dimensions
    this.behaviorEngine.validateDimensionForBehavior(
      employeeId,
      locationId,
      leaveType,
    );

    // Apply behavior with timeout simulation
    return this.behaviorEngine.executeWithBehavior(async () => {
      const key = this.buildKey(employeeId, locationId, leaveType);
      const balance = this.balances.get(key);

      if (!balance) {
        throw new HCMInvalidDimensionException(
          `Balance not found: ${employeeId}/${locationId}/${leaveType}`,
        );
      }

      return {
        employeeId: balance.employeeId,
        locationId: balance.locationId,
        leaveType: balance.leaveType,
        available: balance.available,
        used: balance.used,
        pending: balance.pending,
      };
    });
  }

  /**
   * Validate dimension combination
   */
  async validateDimensions(
    employeeId: string,
    locationId: string,
    leaveType: string,
  ): Promise<boolean> {
    this.behaviorEngine.validateDimensionForBehavior(
      employeeId,
      locationId,
      leaveType,
    );

    const key = this.buildKey(employeeId, locationId, leaveType);
    return this.balances.has(key);
  }

  /**
   * Batch get balances for multiple employees
   */
  async batchGetBalances(
    employees: { employeeId: string; locationId: string; leaveType: string }[],
  ): Promise<Map<string, BalanceResponse>> {
    const results = new Map<string, BalanceResponse>();

    for (const emp of employees) {
      try {
        const key = this.buildKey(emp.employeeId, emp.locationId, emp.leaveType);
        const balance = await this.getBalance(
          emp.employeeId,
          emp.locationId,
          emp.leaveType,
        );
        results.set(key, balance);
      } catch (error: any) {
        // Fixed: was incorrectly logging employees[0]?.employeeId instead of emp.employeeId
        console.error(
          `Error fetching balance for ${emp.employeeId}:`,
          error?.message || 'Unknown error',
        );
      }
    }

    return results;
  }

  /**
   * Update balance (admin operation)
   */
  async updateBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
    newBalance: Partial<Balance>,
  ): Promise<void> {
    const key = this.buildKey(employeeId, locationId, leaveType);
    const balance = this.balances.get(key);

    if (!balance) {
      throw new HCMInvalidDimensionException(
        `Balance not found: ${employeeId}/${locationId}/${leaveType}`,
      );
    }

    // Update with new values
    if (newBalance.available !== undefined) {
      balance.available = newBalance.available;
    }
    if (newBalance.used !== undefined) {
      balance.used = newBalance.used;
    }
    if (newBalance.pending !== undefined) {
      balance.pending = newBalance.pending;
    }
    balance.lastUpdated = new Date();

    this.balances.set(key, balance);
  }

  /**
   * Get all balances for an employee
   */
  async getEmployeeBalances(employeeId: string): Promise<BalanceResponse[]> {
    const results: BalanceResponse[] = [];
    const normalizedEmployeeId = employeeId.toLowerCase();

    for (const [key, balance] of this.balances.entries()) {
      // Fixed: normalize both sides of the comparison
      if (balance.employeeId.toLowerCase() === normalizedEmployeeId) {
        results.push({
          employeeId: balance.employeeId,
          locationId: balance.locationId,
          leaveType: balance.leaveType,
          available: balance.available,
          used: balance.used,
          pending: balance.pending,
        });
      }
    }

    return results;
  }

  /**
   * Get all balances (useful for admin operations)
   */
  getAllBalances(): Balance[] {
    return Array.from(this.balances.values());
  }

  /**
   * Reset all balances to seed data
   */
  resetToSeedData(): void {
    this.balances.clear();
    this.initializeSeedData();
  }
}