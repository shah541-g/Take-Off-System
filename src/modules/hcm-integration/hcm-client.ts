/**
 * HCM Client
 * HTTP client for communicating with HCM APIs
 * Handles balance fetching, request submission, and dimension validation
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

export interface Balance {
  available: number;
  used: number;
}

export interface BalanceRequest {
  employeeId: string;
  locationId: string;
  leaveType: string;
}

export interface TimeOffRequestPayload {
  employeeId: string;
  locationId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

@Injectable()
export class HCMClient {
  private readonly logger = new Logger(HCMClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = (this.configService.get<string>('HCM_BASE_URL') || 'http://localhost:3001').replace(/\/$/, '');
    this.timeoutMs = this.configService.get<number>('HCM_TIMEOUT') || 5000;
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (this.baseUrl.endsWith('/hcm')) {
      return `${this.baseUrl}${normalizedPath}`;
    }

    return `${this.baseUrl}/hcm${normalizedPath}`;
  }

  /**
   * Get current balance for a specific employee, location, and leave type
   * GET /hcm/balances/{employeeId}/{locationId}/{leaveType}
   */
  async getBalance(
    employeeId: string,
    locationId: string,
    leaveType: string,
  ): Promise<Balance> {
    const url = this.buildUrl(`/balances/${employeeId}/${locationId}/${leaveType}`);

    try {
      this.logger.debug(
        `Fetching balance: employeeId=${employeeId}, locationId=${locationId}, leaveType=${leaveType}`,
      );

      const response$ = this.httpService.get<Balance>(url).pipe(
        timeout(this.timeoutMs),
      );

      const response = await firstValueFrom(response$);
      this.logger.debug(
        `Balance fetched successfully: ${JSON.stringify(response.data)}`,
      );

      return response.data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        `Failed to get balance from HCM: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Submit a time-off request to HCM
   * POST /hcm/time-off-requests
   */
  async submitTimeOffRequest(
    requestData: TimeOffRequestPayload,
  ): Promise<{ hcmRequestId: string }> {
    const url = this.buildUrl('/time-off-requests');

    try {
      this.logger.debug(
        `Submitting time-off request to HCM: ${JSON.stringify(requestData)}`,
      );

      const response$ = this.httpService.post<{ hcmRequestId: string }>(
        url,
        requestData,
      ).pipe(timeout(this.timeoutMs));

      const response = await firstValueFrom(response$);
      this.logger.debug(`Time-off request submitted: ${response.data.hcmRequestId}`);

      return response.data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        `Failed to submit time-off request: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Batch get balances for multiple employees in a single call
   * POST /hcm/sync/balances
   * Efficiently synchronize balances for multiple employees
   */
  async batchGetBalances(
    employees: BalanceRequest[],
  ): Promise<Map<string, Balance>> {
    const url = this.buildUrl('/sync/balances');

    try {
      this.logger.debug(
        `Batch fetching balances for ${employees.length} employees`,
      );

      const response$ = this.httpService.post<Record<string, Balance>>(
        url,
        { employees },
      ).pipe(timeout(this.timeoutMs));

      const response = await firstValueFrom(response$);

      // Convert response object to Map
      const balancesMap = new Map<string, Balance>();
      for (const [key, balance] of Object.entries(response.data)) {
        balancesMap.set(key, balance);
      }

      this.logger.debug(`Batch balance fetch completed: ${balancesMap.size} records`);
      return balancesMap;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        `Failed to batch fetch balances: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Validate dimension combination in HCM
   * GET /hcm/dimensions/validate
   * Checks if the employee-location-leaveType combination is valid
   */
  async validateDimensions(
    employeeId: string,
    locationId: string,
    leaveType: string,
  ): Promise<boolean> {
    const url = this.buildUrl('/dimensions/validate');

    try {
      this.logger.debug(
        `Validating dimensions: employeeId=${employeeId}, locationId=${locationId}, leaveType=${leaveType}`,
      );

      const response$ = this.httpService.get<{ valid: boolean }>(
        url,
        {
          params: {
            employeeId,
            locationId,
            leaveType,
          },
        },
      ).pipe(timeout(this.timeoutMs));

      const response = await firstValueFrom(response$);
      this.logger.debug(`Dimension validation result: ${response.data.valid}`);

      return response.data.valid;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        `Failed to validate dimensions: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Check whether the HCM service is responding to health requests.
   * Uses the mock server's published health endpoint, which is safe and non-mutating.
   */
  async pingHealth(): Promise<{ status: string; service?: string; timestamp?: string }> {
    const url = this.buildUrl('/admin/health');

    try {
      this.logger.debug(`Pinging HCM health endpoint: ${url}`);

      const response$ = this.httpService.get<{ status: string; service?: string; timestamp?: string }>(
        url,
      ).pipe(timeout(this.timeoutMs));

      const response = await firstValueFrom(response$);
      this.logger.debug(`HCM health endpoint responded: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(`Failed to ping HCM health endpoint: ${err.message}`, err.stack);
      throw error;
    }
  }
}
